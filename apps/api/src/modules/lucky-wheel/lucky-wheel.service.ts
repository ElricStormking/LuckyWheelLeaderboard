import { randomUUID } from "node:crypto";
import {
  Injectable,
  InternalServerErrorException,
  MessageEvent,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AppLocale,
  CountdownSyncEventDto,
  CurrentEventResponse,
  EligibilityResponse,
  EligibilityStatus,
  EventCampaignDto,
  EventListItemDto,
  EventListResponse,
  EventPrizeDto,
  EventStatus,
  EventStatusChangedEventDto,
  LeaderboardEntryDto,
  LeaderboardResponse,
  LeaderboardTop30EventDto,
  LocalizationConfigResponse,
  PlatformLinkType,
  PlayerEventHistoryResponse,
  PlayerEventSummaryDto,
  PlayerRankChangedEventDto,
  PlayerScoreChangedEventDto,
  PlayerSpinHistoryResponse,
  SpinHistoryEntryDto,
  SpinRequest,
  SpinResponse,
  WheelSegmentDto,
  WheelSegmentOperator,
  WheelVisualState,
} from "@lucky-wheel/contracts";
import { Observable, Subject } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createArchivedDailySpinAllowance,
  createServerDailySpinAllowance,
  type NormalizedDailySpinAllowance,
  resolveCurrentDayWindow,
} from "./daily-spin-policy";
import { resolveAutoFinalizeGraceMinutes } from "./event-lifecycle.config";
import {
  DEMO_PLAYER_ID,
  DEMO_PLAYER_NAME,
  EVENT_PAGE_SIZE,
  HISTORY_PAGE_SIZE,
  LEADERBOARD_SYNC_INTERVAL_MS,
  TEST_LEADERBOARD_PLAYER_NAMES,
} from "./lucky-wheel.constants";
import {
  getEligibilityButtonLabel,
  getHeroSteps,
  getSupportedLocaleOptions,
  resolveRequestedLocale,
  SUPPORTED_LOCALES,
} from "./lucky-wheel.localization";
import { MerchantApiClientService } from "./merchant-api-client.service";

type DatabaseClient = Prisma.TransactionClient | PrismaService;
type EventWithRelations = Prisma.EventCampaignGetPayload<{
  include: {
    localizations: true;
    wheelSegments: {
      include: {
        localizations: true;
      };
    };
    prizes: {
      include: {
        localizations: true;
      };
    };
    platformLinks: {
      include: {
        localizations: true;
      };
    };
  };
}>;
type EventCatalogRecord = Prisma.EventCampaignGetPayload<{
  include: {
    localizations: true;
  };
}>;
type EventLocalizationRecord = Prisma.EventCampaignLocalizationGetPayload<Record<string, never>>;
type WheelSegmentRecord = Prisma.WheelSegmentGetPayload<{
  include: {
    localizations: true;
  };
}>;
type EventPrizeRecord = Prisma.EventPrizeGetPayload<{
  include: {
    localizations: true;
  };
}>;
type PlatformLinkRecord = Prisma.PlatformLinkGetPayload<{
  include: {
    localizations: true;
  };
}>;
type RankedScoreRecord = Prisma.PlayerEventScoreGetPayload<{
  include: {
    player: true;
  };
}>;
type EventSummaryRecord = Prisma.PlayerEventSummaryGetPayload<{
  include: {
    eventCampaign: {
      include: {
        localizations: true;
        prizes: {
          include: {
            localizations: true;
          };
        };
      };
    };
  };
}>;
type NormalizedSpinAllowance = NormalizedDailySpinAllowance & {
  depositEligible: boolean;
  depositUrl?: string;
};
type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};
type RealtimeStreamEntry = {
  subject: Subject<MessageEvent>;
  subscribers: number;
};
type RealtimePlayerState = Omit<PlayerScoreChangedEventDto, "eventId" | "emittedAt">;

const EVENT_CACHE_TTL_MS = 15_000;
const RANKED_SCORE_CACHE_TTL_MS = 2_000;
const TEST_LEADERBOARD_STARTING_SCORE = 6200;
const TEST_LEADERBOARD_SCORE_STEP = 150;
const REALTIME_HEARTBEAT_INTERVAL_MS = 25_000;

@Injectable()
export class LuckyWheelService implements OnModuleInit, OnModuleDestroy {
  private readonly realtimeStreams = new Map<string, RealtimeStreamEntry>();
  private readonly eventCache = new Map<string, CacheEntry<EventWithRelations>>();
  private readonly rankedScoresCache = new Map<string, CacheEntry<RankedScoreRecord[]>>();
  private readonly fillTestLeaderboard =
    (process.env.LUCKY_WHEEL_FILL_TEST_LEADERBOARD ?? "true").toLowerCase() !==
    "false";
  private periodicSyncTimer?: NodeJS.Timeout;
  private liveEventCache?: CacheEntry<EventWithRelations | null>;
  private readonly autoFinalizeGraceMinutes = resolveAutoFinalizeGraceMinutes(
    process.env.EVENT_AUTO_FINALIZE_GRACE_MINUTES,
  );
  private demoPlayerReady = false;
  private demoPlayerReadyPromise?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly merchantApiClientService: MerchantApiClientService,
  ) {}

  onModuleInit() {
    this.periodicSyncTimer = setInterval(() => {
      void this.broadcastPeriodicSync();
    }, LEADERBOARD_SYNC_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
    }

    this.realtimeStreams.forEach(({ subject }) => subject.complete());
    this.realtimeStreams.clear();
  }

  getLocalizationConfig(
    requestedLocale?: string,
    localeHeader?: string,
    acceptLanguage?: string,
  ): LocalizationConfigResponse {
    return {
      requestedLocale,
      resolvedLocale: resolveRequestedLocale(
        requestedLocale,
        localeHeader,
        acceptLanguage,
      ),
      supportedLocales: getSupportedLocaleOptions(),
    };
  }

  async getCurrentEvent(
    locale: AppLocale,
    playerId = DEMO_PLAYER_ID,
  ): Promise<CurrentEventResponse> {
    const event = await this.getLiveEventOrThrow();
    const prizes = this.toPrizeDtos(event.prizes, locale);

    return {
      event: this.toEventCampaignDto(event, locale),
      player: await this.buildPlayerSummary(event, prizes, true, locale, true, playerId),
    };
  }

  async listEvents(
    statuses: EventStatus[],
    page = 1,
    locale: AppLocale,
  ): Promise<EventListResponse> {
    const events = await this.prisma.eventCampaign.findMany({
      where: {
        status: {
          in: statuses,
        },
      },
      include: {
        localizations: true,
      },
    });

    const currentEvent = events.find(
      (entry) => this.parseEnumValue(EventStatus, entry.status, "event status") === EventStatus.Live,
    );
    const sorted = events.sort((left, right) => this.sortEventCatalog(left, right));
    const { items, pageSize, total } = this.paginate(sorted, page, EVENT_PAGE_SIZE);

    return {
      items: items.map((entry) => this.toEventListItemDto(entry, locale)),
      page,
      pageSize,
      total,
      currentEventId: currentEvent?.id ?? null,
    };
  }

  async getEvent(eventId: string, locale: AppLocale): Promise<EventCampaignDto> {
    return this.toEventCampaignDto(await this.getEventOrThrow(eventId), locale);
  }

  async getLeaderboard(
    eventId: string,
    limit = 30,
    locale: AppLocale,
    enforceResultVisibility = true,
    playerId = DEMO_PLAYER_ID,
  ): Promise<LeaderboardResponse> {
    const event = await this.getEventOrThrow(eventId);
    const eventStatus = this.parseEnumValue(EventStatus, event.status, "event status");
    const resultVisibility = this.resolveResultVisibility(
      eventStatus,
      locale,
      enforceResultVisibility,
    );
    if (!resultVisibility.resultsVisible) {
      return {
        eventId,
        leaderboard: [],
        myRank: null,
        totalDisplayed: 0,
        lastSyncedAt: event.updatedAt.toISOString(),
        resultsVisible: false,
        pendingMessage: resultVisibility.pendingMessage,
      };
    }

    const rankedScores = await this.getRankedScores(eventId);
    const prizes = this.toPrizeDtos(event.prizes, locale);
    const leaderboardLimit = Math.min(Math.max(limit, 1), 30);
    const realLeaderboard = rankedScores
      .slice(0, leaderboardLimit)
      .map((entry, index) => this.toLeaderboardEntry(entry, index + 1, prizes, playerId));
    const leaderboard = this.applyExampleLeaderboardScores(
      this.fillLeaderboardWithTesterPlayers(
        realLeaderboard,
        leaderboardLimit,
        prizes,
      ),
    );
    const selfEntry = leaderboard.find((entry) => entry.isSelf) ?? null;
    const selfRank = rankedScores.findIndex((entry) => entry.playerId === playerId);

    return {
      eventId,
      leaderboard,
      myRank:
        selfEntry || selfRank < 0
          ? null
          : this.toLeaderboardEntry(rankedScores[selfRank], selfRank + 1, prizes, playerId),
      totalDisplayed: leaderboard.length,
      lastSyncedAt: this.resolveLastSyncedAt(event.updatedAt, rankedScores),
      resultsVisible: true,
    };
  }

  async getPrizes(eventId: string, locale: AppLocale): Promise<EventPrizeDto[]> {
    const event = await this.getEventOrThrow(eventId);
    return this.toPrizeDtos(event.prizes, locale);
  }

  async getPlayer(
    eventId: string,
    locale: AppLocale,
    enforceResultVisibility = true,
    playerId = DEMO_PLAYER_ID,
  ): Promise<PlayerEventSummaryDto> {
    const event = await this.getEventOrThrow(eventId);
    return this.buildPlayerSummary(
      event,
      this.toPrizeDtos(event.prizes, locale),
      false,
      locale,
      enforceResultVisibility,
      playerId,
    );
  }

  async getPlayerSpinHistory(
    eventId: string,
    page = 1,
    _locale?: AppLocale,
    playerId = DEMO_PLAYER_ID,
  ): Promise<PlayerSpinHistoryResponse> {
    await this.getEventOrThrow(eventId);

    const [total, rows] = await Promise.all([
      this.prisma.spinTransaction.count({
        where: {
          eventCampaignId: eventId,
          playerId,
        },
      }),
      this.prisma.spinTransaction.findMany({
        where: {
          eventCampaignId: eventId,
          playerId,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * HISTORY_PAGE_SIZE,
        take: HISTORY_PAGE_SIZE,
      }),
    ]);

    return {
      eventId,
      page,
      pageSize: HISTORY_PAGE_SIZE,
      total,
      items: rows.map((entry) => this.toSpinHistoryEntry(entry)),
    };
  }

  async getPlayerEventHistory(
    page = 1,
    locale: AppLocale,
    playerId = DEMO_PLAYER_ID,
  ): Promise<PlayerEventHistoryResponse> {
    const [total, rows] = await Promise.all([
      this.prisma.playerEventSummary.count({
        where: {
          playerId,
        },
      }),
      this.prisma.playerEventSummary.findMany({
        where: {
          playerId,
        },
        include: {
          eventCampaign: {
            include: {
              localizations: true,
              prizes: {
                include: {
                  localizations: true,
                },
              },
            },
          },
        },
        orderBy: {
          endedAt: "desc",
        },
        skip: (page - 1) * HISTORY_PAGE_SIZE,
        take: HISTORY_PAGE_SIZE,
      }),
    ]);

    return {
      page,
      pageSize: HISTORY_PAGE_SIZE,
      total,
      items: rows.map((entry) => this.toEventHistoryEntry(entry, locale)),
    };
  }

  async getEligibility(
    eventId: string,
    locale: AppLocale,
    override?: EligibilityStatus,
    playerId = DEMO_PLAYER_ID,
  ): Promise<EligibilityResponse> {
    const event = await this.getEventOrThrow(eventId);
    const eventStatus = this.parseEnumValue(EventStatus, event.status, "event status");
    await this.getPlayerScoreRecord(
      event.id,
      eventStatus,
      this.prisma,
      eventStatus === EventStatus.Live,
      playerId,
    );
    const usedSpinCount = await this.countUsedSpinsForCurrentDay(
      event.id,
      event.timezone,
      this.prisma,
      playerId,
    );
    const spinAllowance = await this.resolveSpinAllowance(
      event.id,
      eventStatus,
      usedSpinCount,
      playerId,
    );
    const eligibilityStatus = this.resolveEligibility(eventStatus, spinAllowance, override);

    return {
      eventId,
      eventStatus,
      eligibilityStatus,
      grantedSpinCount: spinAllowance.grantedSpinCount,
      usedSpinCount: spinAllowance.usedSpinCount,
      remainingSpinCount: spinAllowance.remainingSpinCount,
      spinAllowanceSource: spinAllowance.spinAllowanceSource,
      buttonLabel: this.getButtonLabel(eligibilityStatus, locale),
      wheelVisualState:
        eligibilityStatus === EligibilityStatus.EventEnded
          ? WheelVisualState.GreyedOut
          : WheelVisualState.Normal,
      depositUrl:
        eligibilityStatus === EligibilityStatus.GoToDeposit
          ? spinAllowance.depositUrl
          : undefined,
      messageKey: this.getMessageKey(eligibilityStatus),
    };
  }

  getRealtimeStream(
    eventId: string,
    locale: AppLocale,
    playerId = DEMO_PLAYER_ID,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let isActive = true;
      const stream = this.getOrCreateRealtimeStream(eventId, locale, playerId);
      stream.subscribers += 1;
      const heartbeatTimer = setInterval(() => {
        if (!isActive) {
          return;
        }

        subscriber.next(
          this.createMessage("stream:heartbeat", {
            eventId,
            emittedAt: new Date().toISOString(),
          }),
        );
      }, REALTIME_HEARTBEAT_INTERVAL_MS);

      void this.buildInitialRealtimeMessages(eventId, locale, playerId)
        .then((messages) => {
          if (!isActive) {
            return;
          }

          messages.forEach((message) => subscriber.next(message));
        })
        .catch((error) => subscriber.error(error));

      const subscription = stream.subject.subscribe({
        next: (message) => subscriber.next(message),
        error: (error) => subscriber.error(error),
      });

      return () => {
        isActive = false;
        clearInterval(heartbeatTimer);
        subscription.unsubscribe();
        this.releaseRealtimeStream(eventId, locale, playerId);
      };
    });
  }

  async spin(
    request: SpinRequest,
    override?: EligibilityStatus,
    playerId = DEMO_PLAYER_ID,
  ): Promise<SpinResponse> {
    const event = await this.getEventOrThrow(request.eventId);
    const eventStatus = this.parseEnumValue(EventStatus, event.status, "event status");
    const wheelSegments = this.toWheelSegmentDtos(event.wheelSegments, "en");
    const existingRecord = await this.prisma.spinRequestRecord.findUnique({
      where: {
        idempotencyKey: request.idempotencyKey,
      },
    });

    if (existingRecord) {
      return this.toSpinResponse(existingRecord);
    }

    try {
      const transactionResult = await this.prisma.$transaction(async (transaction) => {
        const playerScore = await this.getPlayerScoreRecord(
          event.id,
          eventStatus,
          transaction,
          true,
          playerId,
        );

        if (!playerScore) {
          throw new NotFoundException(`Missing player event score for ${event.id}`);
        }

        const previousRankedScores = await this.getRankedScores(event.id, transaction);
        const previousRank = this.findPlayerRank(previousRankedScores, playerId);
        const usedSpinCount = await this.countUsedSpinsForCurrentDay(
          event.id,
          event.timezone,
          transaction,
          playerId,
        );
        const spinAllowance = await this.resolveSpinAllowance(
          event.id,
          eventStatus,
          usedSpinCount,
          playerId,
        );
        const eligibilityStatus = this.resolveEligibility(eventStatus, spinAllowance, override);

        if (eligibilityStatus !== EligibilityStatus.PlayableNow) {
          const failure = this.buildFailureResponse(eligibilityStatus, spinAllowance.depositUrl);

          await transaction.spinRequestRecord.create({
            data: {
              id: `spin-request-${randomUUID()}`,
              idempotencyKey: request.idempotencyKey,
              eventCampaignId: event.id,
              playerId,
              success: false,
              eligibilityStatus,
              depositUrl: failure.depositUrl,
              messageKey: failure.messageKey,
            },
          });

          return {
            response: failure as SpinResponse,
            previousRank,
            nextRank: previousRank,
            shouldPublish: false,
          };
        }

        const segment = this.pickWeightedSegment(wheelSegments);
        const scoreResult = this.applyScoreOperator(playerScore.totalScore, segment);
        const rewardValue = this.toStoredRewardValue(segment.rewardValue ?? segment.scoreOperand);

        await transaction.playerEventScore.update({
          where: {
            id: playerScore.id,
          },
          data: {
            totalScore: scoreResult.runningEventTotal,
            hasSpun: true,
          },
        });

        await transaction.spinTransaction.create({
          data: {
            id: `spin-${randomUUID()}`,
            eventCampaignId: event.id,
            playerId,
            segmentIndex: segment.segmentIndex,
            segmentLabel: segment.label,
            scoreDelta: scoreResult.scoreDelta,
            runningEventTotal: scoreResult.runningEventTotal,
            rewardType: segment.rewardType ?? "score",
            rewardValue,
          },
        });

        const rankedScores = await this.getRankedScores(event.id, transaction);
        const rank = this.findPlayerRank(rankedScores, playerId);
        const response: SpinResponse = {
          success: true,
          segmentIndex: segment.segmentIndex,
          scoreDelta: scoreResult.scoreDelta,
          runningEventTotal: scoreResult.runningEventTotal,
          rewardType: segment.rewardType ?? "score",
          rewardValue: segment.rewardValue ?? segment.scoreOperand,
          rank,
          leaderboardChanged: previousRank !== rank,
        };

        await transaction.spinRequestRecord.create({
          data: {
            id: `spin-request-${randomUUID()}`,
            idempotencyKey: request.idempotencyKey,
            eventCampaignId: event.id,
            playerId,
            success: true,
            segmentIndex: response.segmentIndex,
            scoreDelta: response.scoreDelta,
            runningEventTotal: response.runningEventTotal,
            rewardType: response.rewardType,
            rewardValue,
            rank: response.rank,
            leaderboardChanged: response.leaderboardChanged,
          },
        });

        return {
          response,
          previousRank,
          nextRank: rank,
          shouldPublish: true,
        };
      });

      if (transactionResult.shouldPublish && transactionResult.response.success) {
        this.invalidateRankedScoresCache(event.id);
        await this.publishPostSpinRealtime(
          event.id,
          transactionResult.previousRank,
          transactionResult.nextRank,
          playerId,
        );
      }

      return transactionResult.response;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const cached = await this.prisma.spinRequestRecord.findUnique({
          where: {
            idempotencyKey: request.idempotencyKey,
          },
        });

        if (cached) {
          return this.toSpinResponse(cached);
        }
      }

      throw error;
    }
  }

  private async buildPlayerSummary(
    event: EventWithRelations,
    prizes: EventPrizeDto[],
    createLiveScore: boolean,
    locale: AppLocale,
    enforceResultVisibility = true,
    playerId = DEMO_PLAYER_ID,
  ): Promise<PlayerEventSummaryDto> {
    await this.ensurePlayerExists(playerId);

    const eventStatus = this.parseEnumValue(EventStatus, event.status, "event status");
    const [player, playerScore, rankedScores, summaryRecord, spinHistory, usedSpinCount, eventHistory] =
      await Promise.all([
        this.prisma.player.findUnique({
          where: {
            id: playerId,
          },
        }),
        this.getPlayerScoreRecord(event.id, eventStatus, this.prisma, createLiveScore, playerId),
        this.getRankedScores(event.id),
        this.prisma.playerEventSummary.findUnique({
          where: {
            eventCampaignId_playerId: {
              eventCampaignId: event.id,
              playerId,
            },
          },
          include: {
            eventCampaign: {
              include: {
                localizations: true,
                prizes: {
                  include: {
                    localizations: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.spinTransaction.findMany({
          where: {
            eventCampaignId: event.id,
            playerId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: HISTORY_PAGE_SIZE,
        }),
        this.countUsedSpinsForCurrentDay(event.id, event.timezone, this.prisma, playerId),
        this.prisma.playerEventSummary.findMany({
          where: {
            playerId,
          },
          include: {
            eventCampaign: {
              include: {
                localizations: true,
                prizes: {
                  include: {
                    localizations: true,
                  },
                },
              },
            },
          },
          orderBy: {
            endedAt: "desc",
          },
          take: HISTORY_PAGE_SIZE,
        }),
      ]);

    if (!player) {
      throw new NotFoundException(`Unknown player: ${playerId}`);
    }

    const selfIndex = rankedScores.findIndex((entry) => entry.playerId === playerId);
    const resultVisibility = this.resolveResultVisibility(
      eventStatus,
      locale,
      enforceResultVisibility,
    );
    const resolvedRank = selfIndex >= 0 ? selfIndex + 1 : summaryRecord?.finalRank ?? null;
    const rank = resultVisibility.resultsVisible ? resolvedRank : null;
    const totalScore = playerScore?.totalScore ?? summaryRecord?.finalScore ?? 0;
    const spinAllowance = await this.resolveSpinAllowance(
      event.id,
      eventStatus,
      usedSpinCount,
      playerId,
    );

    return {
      playerId: player.id,
      playerName: player.displayName,
      totalScore,
      rank,
      prizeName:
        resultVisibility.resultsVisible && rank
          ? this.resolvePrizeName(rank, prizes)
          : null,
      isTop30: resultVisibility.resultsVisible && rank !== null && rank <= 30,
      hasSpun: spinHistory.length > 0 || Boolean(summaryRecord),
      grantedSpinCount: spinAllowance.grantedSpinCount,
      usedSpinCount: spinAllowance.usedSpinCount,
      remainingSpinCount: spinAllowance.remainingSpinCount,
      spinAllowanceSource: spinAllowance.spinAllowanceSource,
      resultsVisible: resultVisibility.resultsVisible,
      pendingMessage: resultVisibility.pendingMessage,
      spinHistory: spinHistory.map((entry) => this.toSpinHistoryEntry(entry)),
      eventHistory: eventHistory.map((entry) => this.toEventHistoryEntry(entry, locale)),
    };
  }

  private async getLiveEventOrThrow(): Promise<EventWithRelations> {
    if (this.isCacheFresh(this.liveEventCache) && this.liveEventCache.value) {
      return this.liveEventCache.value;
    }

    const event = await this.prisma.eventCampaign.findFirst({
      where: {
        status: EventStatus.Live,
      },
      include: {
        localizations: true,
        wheelSegments: {
          include: {
            localizations: true,
          },
          orderBy: {
            segmentIndex: "asc",
          },
        },
        prizes: {
          include: {
            localizations: true,
          },
          orderBy: [
            {
              displayOrder: "asc",
            },
            {
              rankFrom: "asc",
            },
          ],
        },
        platformLinks: {
          include: {
            localizations: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    if (!event) {
      throw new NotFoundException("No live event is configured.");
    }

    if (this.parseEnumValue(EventStatus, event.status, "event status") === EventStatus.Live) {
      this.validateWheelDefinition(event.wheelSegments);
    }

    this.liveEventCache = this.createCacheEntry(event, EVENT_CACHE_TTL_MS);
    this.eventCache.set(event.id, this.createCacheEntry(event, EVENT_CACHE_TTL_MS));
    return event;
  }

  private async getEventOrThrow(eventId: string): Promise<EventWithRelations> {
    const cachedEvent = this.eventCache.get(eventId);
    if (this.isCacheFresh(cachedEvent)) {
      return cachedEvent.value;
    }

    const event = await this.prisma.eventCampaign.findUnique({
      where: {
        id: eventId,
      },
      include: {
        localizations: true,
        wheelSegments: {
          include: {
            localizations: true,
          },
          orderBy: {
            segmentIndex: "asc",
          },
        },
        prizes: {
          include: {
            localizations: true,
          },
          orderBy: [
            {
              displayOrder: "asc",
            },
            {
              rankFrom: "asc",
            },
          ],
        },
        platformLinks: {
          include: {
            localizations: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Unknown event: ${eventId}`);
    }

    if (this.parseEnumValue(EventStatus, event.status, "event status") === EventStatus.Live) {
      this.validateWheelDefinition(event.wheelSegments);
    }

    this.eventCache.set(event.id, this.createCacheEntry(event, EVENT_CACHE_TTL_MS));
    return event;
  }

  private async ensurePlayerExists(
    playerId: string,
    client: DatabaseClient = this.prisma,
  ) {
    if (playerId === DEMO_PLAYER_ID && this.demoPlayerReady) {
      return;
    }

    if (playerId === DEMO_PLAYER_ID && client === this.prisma) {
      if (!this.demoPlayerReadyPromise) {
        this.demoPlayerReadyPromise = this.ensurePlayerExistsInDatabase(playerId, client).finally(() => {
          this.demoPlayerReadyPromise = undefined;
        });
      }

      await this.demoPlayerReadyPromise;
      return;
    }

    await this.ensurePlayerExistsInDatabase(playerId, client);
  }

  private async getPlayerScoreRecord(
    eventId: string,
    eventStatus: EventStatus,
    client: DatabaseClient = this.prisma,
    createIfMissing = false,
    playerId = DEMO_PLAYER_ID,
  ) {
    await this.ensurePlayerExists(playerId, client);

    if (eventStatus === EventStatus.Live && createIfMissing) {
      return client.playerEventScore.upsert({
        where: {
          eventCampaignId_playerId: {
            eventCampaignId: eventId,
            playerId,
          },
        },
        update: {},
        create: {
          id: `score-${eventId}-${playerId}`,
          eventCampaignId: eventId,
          playerId,
          totalScore: 0,
          hasSpun: false,
        },
      });
    }

    return client.playerEventScore.findUnique({
      where: {
        eventCampaignId_playerId: {
          eventCampaignId: eventId,
          playerId,
        },
      },
    });
  }

  private countUsedSpinsForCurrentDay(
    eventId: string,
    timezone: string,
    client: DatabaseClient = this.prisma,
    playerId = DEMO_PLAYER_ID,
  ) {
    const { start, end } = resolveCurrentDayWindow(timezone);

    return client.spinTransaction.count({
      where: {
        eventCampaignId: eventId,
        playerId,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });
  }

  private getRankedScores(
    eventId: string,
    client: DatabaseClient = this.prisma,
  ): Promise<RankedScoreRecord[]> {
    if (client === this.prisma) {
      const cachedScores = this.rankedScoresCache.get(eventId);
      if (this.isCacheFresh(cachedScores)) {
        return Promise.resolve(cachedScores.value);
      }
    }

    return client.playerEventScore.findMany({
      where: {
        eventCampaignId: eventId,
      },
      include: {
        player: true,
      },
      orderBy: [
        {
          totalScore: "desc",
        },
        {
          updatedAt: "asc",
        },
        {
          playerId: "asc",
        },
      ],
    }).then((scores) => {
      if (client === this.prisma) {
        this.rankedScoresCache.set(
          eventId,
          this.createCacheEntry(scores, RANKED_SCORE_CACHE_TTL_MS),
        );
      }

      return scores;
    });
  }

  private toEventCampaignDto(event: EventWithRelations, locale: AppLocale): EventCampaignDto {
    const translation = this.resolveEventTranslation(event.localizations, locale);

    return {
      id: event.id,
      code: event.code,
      title: translation?.title ?? event.title,
      shortDescription: translation?.shortDescription ?? event.shortDescription,
      status: this.parseEnumValue(EventStatus, event.status, "event status"),
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      timezone: event.timezone,
      countdownEndsAt: event.countdownEndsAt.toISOString(),
      promotionPeriodLabel:
        translation?.promotionPeriodLabel ?? event.promotionPeriodLabel,
      styleTheme: event.styleTheme,
      heroSteps: getHeroSteps(locale).map((entry) => ({
        title: entry.title,
        subtitle: entry.subtitle,
        iconKey: entry.iconKey,
      })),
      wheelSegments: this.toWheelSegmentDtos(event.wheelSegments, locale),
      rulesContent: translation?.rulesContent ?? event.rulesContent,
      platformLinks: event.platformLinks.map((entry) => ({
        type: this.parseEnumValue(PlatformLinkType, entry.linkType, "platform link type"),
        label: this.resolvePlatformLinkLabel(entry, locale),
        url: entry.url,
      })),
    };
  }

  private toEventListItemDto(
    event: EventCatalogRecord,
    locale: AppLocale,
  ): EventListItemDto {
    const translation = this.resolveEventTranslation(event.localizations, locale);

    return {
      id: event.id,
      code: event.code,
      title: translation?.title ?? event.title,
      shortDescription: translation?.shortDescription ?? event.shortDescription,
      status: this.parseEnumValue(EventStatus, event.status, "event status"),
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      countdownEndsAt: event.countdownEndsAt.toISOString(),
      promotionPeriodLabel:
        translation?.promotionPeriodLabel ?? event.promotionPeriodLabel,
    };
  }

  private toWheelSegmentDtos(
    segments: EventWithRelations["wheelSegments"],
    locale: AppLocale,
  ): WheelSegmentDto[] {
    return segments.map((segment) => ({
      segmentIndex: segment.segmentIndex,
      label: this.resolveWheelSegmentLabel(segment, locale),
      scoreOperator: this.parseEnumValue(
        WheelSegmentOperator,
        segment.scoreOperator,
        "wheel segment operator",
      ),
      scoreOperand: segment.scoreOperand,
      weightPercent: segment.weightPercent,
      displayAssetKey: segment.displayAssetKey,
      rewardType: segment.rewardType,
      rewardValue: this.parseStoredRewardValue(segment.rewardValue),
    }));
  }

  private toPrizeDtos(
    prizes: EventWithRelations["prizes"],
    locale: AppLocale,
  ): EventPrizeDto[] {
    return prizes.map((prize) => ({
      id: prize.id,
      rankFrom: prize.rankFrom,
      rankTo: prize.rankTo,
      prizeLabel: this.resolvePrizeTranslation(prize, locale)?.prizeLabel ?? prize.prizeLabel,
      prizeDescription:
        this.resolvePrizeTranslation(prize, locale)?.prizeDescription ??
        prize.prizeDescription,
      imageUrl: prize.imageUrl,
      accentLabel:
        this.resolvePrizeTranslation(prize, locale)?.accentLabel ??
        prize.accentLabel ??
        undefined,
    }));
  }

  private toLeaderboardEntry(
    score: RankedScoreRecord,
    rank: number,
    prizes: EventPrizeDto[],
    selfPlayerId = DEMO_PLAYER_ID,
  ): LeaderboardEntryDto {
    return {
      rank,
      playerName: score.player.displayName,
      score: score.totalScore,
      prizeName: this.resolvePrizeName(rank, prizes),
      isSelf: score.playerId === selfPlayerId,
    };
  }

  private fillLeaderboardWithTesterPlayers(
    leaderboard: LeaderboardEntryDto[],
    limit: number,
    prizes: EventPrizeDto[],
  ) {
    if (!this.fillTestLeaderboard || leaderboard.length >= limit) {
      return leaderboard;
    }

    const usedNames = new Set(
      leaderboard.map((entry) => entry.playerName.trim().toLowerCase()),
    );
    const filled = [...leaderboard];
    let fallbackScore =
      filled.length === 0
        ? TEST_LEADERBOARD_STARTING_SCORE
        : Math.max(
            (filled[filled.length - 1]?.score ?? 0) - TEST_LEADERBOARD_SCORE_STEP,
            0,
          );

    for (const playerName of TEST_LEADERBOARD_PLAYER_NAMES) {
      if (filled.length >= limit) {
        break;
      }

      if (usedNames.has(playerName.toLowerCase())) {
        continue;
      }

      const rank = filled.length + 1;
      const score =
        leaderboard.length === 0
          ? Math.max(
              TEST_LEADERBOARD_STARTING_SCORE - (rank - 1) * TEST_LEADERBOARD_SCORE_STEP,
              0,
            )
          : fallbackScore;

      filled.push({
        rank,
        playerName,
        score,
        prizeName: this.resolvePrizeName(rank, prizes),
        isSelf: false,
      });
      usedNames.add(playerName.toLowerCase());
      fallbackScore = Math.max(score - TEST_LEADERBOARD_SCORE_STEP, 0);
    }

    return filled;
  }

  private applyExampleLeaderboardScores(leaderboard: LeaderboardEntryDto[]) {
    if (!this.fillTestLeaderboard || leaderboard.length === 0) {
      return leaderboard;
    }

    const shouldOverrideScores = leaderboard.every((entry) => entry.score <= 0);
    if (!shouldOverrideScores) {
      return leaderboard;
    }

    return leaderboard.map((entry, index) => ({
      ...entry,
      score: Math.max(
        TEST_LEADERBOARD_STARTING_SCORE - index * TEST_LEADERBOARD_SCORE_STEP,
        0,
      ),
    }));
  }

  private toSpinHistoryEntry(
    entry: Prisma.SpinTransactionGetPayload<Record<string, never>>,
  ): SpinHistoryEntryDto {
    return {
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      segmentIndex: entry.segmentIndex,
      segmentLabel: entry.segmentLabel,
      scoreDelta: entry.scoreDelta,
      runningEventTotal: entry.runningEventTotal,
    };
  }

  private toEventHistoryEntry(entry: EventSummaryRecord, locale: AppLocale) {
    const translation = this.resolveEventTranslation(
      entry.eventCampaign.localizations,
      locale,
    );
    const prizes = this.toPrizeDtos(entry.eventCampaign.prizes, locale);

    return {
      eventId: entry.eventCampaignId,
      eventName: translation?.title ?? entry.eventCampaign.title,
      finalRank: entry.finalRank,
      finalScore: entry.finalScore,
      prizeName:
        entry.finalRank !== null
          ? this.resolvePrizeName(entry.finalRank, prizes)
          : entry.prizeName,
      endedAt: entry.endedAt.toISOString(),
    };
  }

  private resolveEventTranslation(
    localizations: EventLocalizationRecord[],
    locale: AppLocale,
  ) {
    return (
      localizations.find((entry) => entry.locale === locale) ??
      localizations.find((entry) => entry.locale === "en")
    );
  }

  private resolveWheelSegmentLabel(segment: WheelSegmentRecord, locale: AppLocale) {
    return (
      segment.localizations.find((entry) => entry.locale === locale)?.label ??
      segment.localizations.find((entry) => entry.locale === "en")?.label ??
      segment.label
    );
  }

  private resolvePrizeTranslation(prize: EventPrizeRecord, locale: AppLocale) {
    return (
      prize.localizations.find((entry) => entry.locale === locale) ??
      prize.localizations.find((entry) => entry.locale === "en")
    );
  }

  private resolvePlatformLinkLabel(link: PlatformLinkRecord, locale: AppLocale) {
    return (
      link.localizations.find((entry) => entry.locale === locale)?.label ??
      link.localizations.find((entry) => entry.locale === "en")?.label ??
      link.label
    );
  }

  private toSpinResponse(
    record: Prisma.SpinRequestRecordGetPayload<Record<string, never>>,
  ): SpinResponse {
    if (!record.success) {
      return {
        success: false,
        eligibilityStatus: this.parseEnumValue(
          EligibilityStatus,
          record.eligibilityStatus ?? EligibilityStatus.EventEnded,
          "eligibility status",
        ),
        depositUrl: record.depositUrl ?? undefined,
        messageKey: record.messageKey ?? undefined,
      };
    }

    return {
      success: true,
      segmentIndex: record.segmentIndex ?? 0,
      scoreDelta: record.scoreDelta ?? 0,
      runningEventTotal: record.runningEventTotal ?? 0,
      rewardType: record.rewardType ?? "score",
      rewardValue: this.parseStoredRewardValue(record.rewardValue),
      rank: record.rank,
      leaderboardChanged: Boolean(record.leaderboardChanged),
    };
  }

  private async resolveSpinAllowance(
    eventId: string,
    eventStatus: EventStatus,
    usedSpinCount: number,
    playerId = DEMO_PLAYER_ID,
  ): Promise<NormalizedSpinAllowance> {
    if (eventStatus !== EventStatus.Live) {
      return {
        ...createArchivedDailySpinAllowance(),
        depositEligible: false,
      };
    }

    const dailySpinAllowance = createServerDailySpinAllowance(usedSpinCount);
    const merchantEligibility = await this.merchantApiClientService.getEligibilitySnapshot(
      playerId,
      eventId,
    );

    return {
      ...dailySpinAllowance,
      depositEligible: merchantEligibility.depositQualified,
      depositUrl: merchantEligibility.depositUrl,
    };
  }

  private resolveEligibility(
    eventStatus: EventStatus,
    spinAllowance: NormalizedSpinAllowance,
    override?: EligibilityStatus,
  ): EligibilityStatus {
    if (override) {
      return override;
    }

    if (eventStatus !== EventStatus.Live) {
      return EligibilityStatus.EventEnded;
    }

    if (!spinAllowance.canSpinToday || spinAllowance.remainingSpinCount <= 0) {
      return EligibilityStatus.AlreadySpin;
    }

    if (!spinAllowance.depositEligible) {
      return EligibilityStatus.GoToDeposit;
    }

    return EligibilityStatus.PlayableNow;
  }

  private buildFailureResponse(
    eligibilityStatus: EligibilityStatus,
    depositUrl?: string,
  ): Extract<SpinResponse, { success: false }> {
    return {
      success: false,
      eligibilityStatus,
      depositUrl,
      messageKey: this.getMessageKey(eligibilityStatus),
    };
  }

  private applyScoreOperator(currentScore: number, segment: WheelSegmentDto) {
    let nextScore = currentScore;

    switch (segment.scoreOperator) {
      case WheelSegmentOperator.Add:
        nextScore = currentScore + segment.scoreOperand;
        break;
      case WheelSegmentOperator.Subtract:
        nextScore = currentScore - segment.scoreOperand;
        break;
      case WheelSegmentOperator.Multiply:
        nextScore = currentScore * segment.scoreOperand;
        break;
      case WheelSegmentOperator.Divide:
        nextScore =
          segment.scoreOperand === 0
            ? currentScore
            : Math.floor(currentScore / segment.scoreOperand);
        break;
      case WheelSegmentOperator.Equals:
        nextScore = segment.scoreOperand;
        break;
      default:
        nextScore = currentScore;
    }

    const safeScore = Math.max(0, nextScore);

    return {
      runningEventTotal: safeScore,
      scoreDelta: safeScore - currentScore,
    };
  }

  private pickWeightedSegment(segments: WheelSegmentDto[]) {
    const roll = Math.random() * 100;
    let cursor = 0;

    for (const segment of segments) {
      cursor += segment.weightPercent;
      if (roll <= cursor) {
        return segment;
      }
    }

    return segments[segments.length - 1];
  }

  private findPlayerRank(scores: RankedScoreRecord[], playerId: string): number | null {
    const index = scores.findIndex((entry) => entry.playerId === playerId);
    return index >= 0 ? index + 1 : null;
  }

  private resolvePrizeName(rank: number, prizes: EventPrizeDto[]) {
    const prize = prizes.find((entry) => rank >= entry.rankFrom && rank <= entry.rankTo);
    return prize?.prizeLabel ?? null;
  }

  private resolveLastSyncedAt(eventUpdatedAt: Date, scores: RankedScoreRecord[]) {
    const latestScoreUpdate = scores.reduce(
      (latest, entry) => Math.max(latest, entry.updatedAt.getTime()),
      eventUpdatedAt.getTime(),
    );

    return new Date(latestScoreUpdate).toISOString();
  }

  private resolveResultVisibility(
    eventStatus: EventStatus,
    locale: AppLocale,
    enforceResultVisibility: boolean,
  ) {
    if (!enforceResultVisibility || eventStatus !== EventStatus.Ended) {
      return {
        resultsVisible: true,
        pendingMessage: undefined,
      };
    }

    return {
      resultsVisible: false,
      pendingMessage: this.getResultPendingMessage(locale),
    };
  }

  private getResultPendingMessage(locale: AppLocale) {
    switch (locale) {
      case "ms":
        return `Keputusan acara sedang dikira, ia akan dipaparkan selepas ${this.autoFinalizeGraceMinutes} minit.`;
      case "zh-CN":
        return `活动结果正在计算中，将在 ${this.autoFinalizeGraceMinutes} 分钟后显示。`;
      case "en":
      default:
        return `Event Result is be calculated, it will be shown after ${this.autoFinalizeGraceMinutes} minutes.`;
    }
  }

  private parseStoredRewardValue(value: string | null): string | number | null {
    if (value === null) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  private toStoredRewardValue(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  }

  private validateWheelDefinition(segments: EventWithRelations["wheelSegments"]) {
    if (segments.length !== 6) {
      throw new InternalServerErrorException(
        "Live event wheel must contain exactly 6 segments.",
      );
    }

    const totalWeight = segments.reduce((sum, segment) => sum + segment.weightPercent, 0);
    if (totalWeight !== 100) {
      throw new InternalServerErrorException(
        "Live event wheel weights must total 100.",
      );
    }
  }

  private parseEnumValue<T extends string>(
    enumType: Record<string, T>,
    value: string,
    label: string,
  ): T {
    const allowedValues = Object.values(enumType);

    if (!allowedValues.includes(value as T)) {
      throw new InternalServerErrorException(`Invalid ${label}: ${value}`);
    }

    return value as T;
  }

  private sortEventCatalog(
    left: EventCatalogRecord,
    right: EventCatalogRecord,
  ) {
    const priority = (status: EventStatus) => {
      switch (status) {
        case EventStatus.Live:
          return 0;
        case EventStatus.Ended:
          return 1;
        case EventStatus.Finalized:
          return 2;
        default:
          return 3;
      }
    };

    const leftStatus = this.parseEnumValue(EventStatus, left.status, "event status");
    const rightStatus = this.parseEnumValue(EventStatus, right.status, "event status");
    const statusDelta = priority(leftStatus) - priority(rightStatus);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return right.endAt.getTime() - left.endAt.getTime();
  }

  private paginate<T>(items: T[], page: number, pageSize: number) {
    const safePage = Math.max(page, 1);
    const start = (safePage - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      pageSize,
      total: items.length,
    };
  }

  private getOrCreateRealtimeStream(
    eventId: string,
    locale: AppLocale,
    playerId: string,
  ) {
    const streamKey = this.toRealtimeStreamKey(eventId, locale, playerId);
    let stream = this.realtimeStreams.get(streamKey);

    if (!stream) {
      stream = {
        subject: new Subject<MessageEvent>(),
        subscribers: 0,
      };
      this.realtimeStreams.set(streamKey, stream);
    }

    return stream;
  }

  private releaseRealtimeStream(
    eventId: string,
    locale: AppLocale,
    playerId: string,
  ) {
    const streamKey = this.toRealtimeStreamKey(eventId, locale, playerId);
    const stream = this.realtimeStreams.get(streamKey);

    if (!stream) {
      return;
    }

    stream.subscribers = Math.max(0, stream.subscribers - 1);
    if (stream.subscribers > 0) {
      return;
    }

    stream.subject.complete();
    this.realtimeStreams.delete(streamKey);
  }

  private async buildInitialRealtimeMessages(
    eventId: string,
    locale: AppLocale,
    playerId: string,
  ) {
    const event = await this.getEventOrThrow(eventId);
    const prizes = this.toPrizeDtos(event.prizes, locale);
    const status = this.parseEnumValue(EventStatus, event.status, "event status");
    const emittedAt = new Date().toISOString();
    const [leaderboard, player] = await Promise.all([
      this.getLeaderboard(eventId, 30, locale, true, playerId),
      this.buildRealtimePlayerState(event, status, prizes, playerId),
    ]);
    const messages: MessageEvent[] = [
      this.createMessage<EventStatusChangedEventDto>("event:statusChanged", {
        eventId,
        emittedAt,
        status,
      }),
      this.createMessage<LeaderboardTop30EventDto>("leaderboard:top30", {
        eventId,
        emittedAt,
        leaderboard,
      }),
      this.createMessage<PlayerScoreChangedEventDto>("player:scoreChanged", {
        eventId,
        emittedAt,
        ...player,
      }),
    ];

    if (status === EventStatus.Live) {
      messages.push(
        this.createMessage<CountdownSyncEventDto>("event:countdownSync", {
          eventId,
          emittedAt,
          countdownEndsAt: event.countdownEndsAt.toISOString(),
          serverNow: emittedAt,
        }),
      );
    }

    return messages;
  }

  private createMessage<T extends object>(type: string, data: T): MessageEvent {
    return {
      type,
      data,
    };
  }

  private async publishPostSpinRealtime(
    eventId: string,
    previousRank: number | null,
    nextRank: number | null,
    spinningPlayerId: string,
  ) {
    const event = await this.getEventOrThrow(eventId);
    const status = this.parseEnumValue(EventStatus, event.status, "event status");
    const emittedAt = new Date().toISOString();
    const leaderboardByLocale = new Map<AppLocale, LeaderboardResponse>();
    const playerStateByStream = new Map<string, RealtimePlayerState>();

    for (const streamEntry of this.getRealtimeStreamsForEvent(eventId)) {
      const { locale, playerId, stream } = streamEntry;
      const prizes = this.toPrizeDtos(event.prizes, locale);
      const leaderboard =
        leaderboardByLocale.get(locale) ??
        (await this.getLeaderboard(eventId, 30, locale, true, playerId));
      leaderboardByLocale.set(locale, leaderboard);
      const streamKey = this.toRealtimeStreamKey(eventId, locale, playerId);
      const player =
        playerStateByStream.get(streamKey) ??
        (await this.buildRealtimePlayerState(event, status, prizes, playerId));
      playerStateByStream.set(streamKey, player);

      stream.subject.next(
        this.createMessage<LeaderboardTop30EventDto>("leaderboard:top30", {
          eventId,
          emittedAt,
          leaderboard,
        }),
      );
      stream.subject.next(
        this.createMessage<PlayerScoreChangedEventDto>("player:scoreChanged", {
          eventId,
          emittedAt,
          ...player,
        }),
      );

      if (playerId === spinningPlayerId && previousRank !== nextRank) {
        stream.subject.next(
          this.createMessage<PlayerRankChangedEventDto>("player:rankChanged", {
            eventId,
            emittedAt,
            previousRank,
            rank: nextRank,
            prizeName: player.prizeName,
          }),
        );
      }
    }
  }

  private async broadcastPeriodicSync() {
    const liveEvent = await this.getLiveEventOrNull();

    if (!liveEvent) {
      return;
    }

    const emittedAt = new Date().toISOString();

    const leaderboardByLocale = new Map<AppLocale, LeaderboardResponse>();
    for (const streamEntry of this.getRealtimeStreamsForEvent(liveEvent.id)) {
      const { locale, playerId, stream } = streamEntry;
      const leaderboard =
        leaderboardByLocale.get(locale) ??
        (await this.getLeaderboard(liveEvent.id, 30, locale, true, playerId));
      leaderboardByLocale.set(locale, leaderboard);

      stream.subject.next(
        this.createMessage<CountdownSyncEventDto>("event:countdownSync", {
          eventId: liveEvent.id,
          emittedAt,
          countdownEndsAt: liveEvent.countdownEndsAt.toISOString(),
          serverNow: emittedAt,
        }),
      );
      stream.subject.next(
        this.createMessage<LeaderboardTop30EventDto>("leaderboard:top30", {
          eventId: liveEvent.id,
          emittedAt,
          leaderboard,
        }),
      );
    }
  }

  private async getLiveEventOrNull() {
    if (this.isCacheFresh(this.liveEventCache)) {
      return this.liveEventCache.value;
    }

    return this.prisma.eventCampaign.findFirst({
      where: {
        status: EventStatus.Live,
      },
      include: {
        localizations: true,
        wheelSegments: {
          include: {
            localizations: true,
          },
          orderBy: {
            segmentIndex: "asc",
          },
        },
        prizes: {
          include: {
            localizations: true,
          },
          orderBy: [
            {
              displayOrder: "asc",
            },
            {
              rankFrom: "asc",
            },
          ],
        },
        platformLinks: {
          include: {
            localizations: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    }).then((event) => {
      this.liveEventCache = this.createCacheEntry(event, EVENT_CACHE_TTL_MS);
      if (event) {
        this.eventCache.set(event.id, this.createCacheEntry(event, EVENT_CACHE_TTL_MS));
      }

      return event;
    });
  }

  private toRealtimeStreamKey(eventId: string, locale: AppLocale, playerId: string) {
    return `${eventId}::${locale}::${playerId}`;
  }

  private getRealtimeStreamsForEvent(eventId: string) {
    const entries: Array<{
      locale: AppLocale;
      playerId: string;
      stream: RealtimeStreamEntry;
    }> = [];

    this.realtimeStreams.forEach((stream, key) => {
      if (stream.subscribers === 0) {
        return;
      }

      const [streamEventId, locale, playerId] = key.split("::");
      if (
        streamEventId === eventId &&
        playerId &&
        SUPPORTED_LOCALES.includes(locale as AppLocale)
      ) {
        entries.push({
          locale: locale as AppLocale,
          playerId,
          stream,
        });
      }
    });

    return entries;
  }

  private getButtonLabel(status: EligibilityStatus, locale: AppLocale) {
    return getEligibilityButtonLabel(status, locale);
  }

  private getMessageKey(status: EligibilityStatus) {
    switch (status) {
      case EligibilityStatus.AlreadySpin:
        return "eligibility.alreadySpin";
      case EligibilityStatus.GoToDeposit:
        return "eligibility.goToDeposit";
      case EligibilityStatus.EventEnded:
        return "eligibility.eventEnded";
      case EligibilityStatus.PlayableNow:
      default:
        return "eligibility.playableNow";
    }
  }

  private async ensurePlayerExistsInDatabase(
    playerId: string,
    client: DatabaseClient,
  ) {
    const existingPlayer = await client.player.findUnique({
      where: {
        id: playerId,
      },
      select: {
        id: true,
      },
    });

    if (existingPlayer) {
      if (playerId === DEMO_PLAYER_ID) {
        this.demoPlayerReady = true;
      }
      return;
    }

    try {
      await client.player.create({
        data: {
          id: playerId,
          externalUserId: playerId,
          displayName: playerId === DEMO_PLAYER_ID ? DEMO_PLAYER_NAME : playerId,
          status: "active",
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
    }

    if (playerId === DEMO_PLAYER_ID) {
      this.demoPlayerReady = true;
    }
  }

  private async buildRealtimePlayerState(
    event: EventWithRelations,
    eventStatus: EventStatus,
    prizes: EventPrizeDto[],
    playerId = DEMO_PLAYER_ID,
  ): Promise<RealtimePlayerState> {
    await this.ensurePlayerExists(playerId);

    const [player, playerScore, rankedScores, usedSpinCount] = await Promise.all([
      this.prisma.player.findUnique({
        where: {
          id: playerId,
        },
      }),
      this.getPlayerScoreRecord(event.id, eventStatus, this.prisma, false, playerId),
      this.getRankedScores(event.id),
      this.countUsedSpinsForCurrentDay(event.id, event.timezone, this.prisma, playerId),
    ]);

    if (!player) {
      throw new NotFoundException(`Unknown player: ${playerId}`);
    }

    const spinAllowance = await this.resolveSpinAllowance(
      event.id,
      eventStatus,
      usedSpinCount,
      playerId,
    );
    const rank = this.findPlayerRank(rankedScores, playerId);

    return {
      totalScore: playerScore?.totalScore ?? 0,
      rank,
      prizeName: rank ? this.resolvePrizeName(rank, prizes) : null,
      hasSpun: playerScore?.hasSpun ?? usedSpinCount > 0,
      grantedSpinCount: spinAllowance.grantedSpinCount,
      usedSpinCount: spinAllowance.usedSpinCount,
      remainingSpinCount: spinAllowance.remainingSpinCount,
      spinAllowanceSource: spinAllowance.spinAllowanceSource,
    };
  }

  private createCacheEntry<T>(value: T, ttlMs: number): CacheEntry<T> {
    return {
      value,
      expiresAt: Date.now() + ttlMs,
    };
  }

  private isCacheFresh<T>(entry?: CacheEntry<T>): entry is CacheEntry<T> {
    return Boolean(entry && entry.expiresAt > Date.now());
  }

  private invalidateRankedScoresCache(eventId?: string) {
    if (eventId) {
      this.rankedScoresCache.delete(eventId);
      return;
    }

    this.rankedScoresCache.clear();
  }
}
