import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AdminAuditLogDto,
  AdminAuditLogResponse,
  AdminEventConfigDto,
  AdminEventDashboardResponse,
  AdminEventEditorResponse,
  AdminEventLocalizationDto,
  AdminEventPrizesUpdateRequest,
  AdminEventTermsUpdateRequest,
  AdminEventUpsertRequest,
  AdminEligibilityRecordsResponse,
  AdminLocalizationCoverageDto,
  AdminOverviewResponse,
  AdminParticipantsResponse,
  AdminPlatformLinksUpdateRequest,
  AdminSpinRecordsResponse,
  AppLocale,
  EligibilityStatus,
  EventStatus,
  MerchantApiStatusDto,
  PlatformLinkType,
  WheelSegmentOperator,
} from "@lucky-wheel/contracts";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createArchivedDailySpinAllowance,
  createServerDailySpinAllowance,
  resolveCurrentDayWindow,
} from "../lucky-wheel/daily-spin-policy";
import { EventFinalizationService } from "../lucky-wheel/event-finalization.service";
import { MerchantApiClientService } from "../lucky-wheel/merchant-api-client.service";
import {
  getSupportedLocaleOptions,
  SUPPORTED_LOCALES,
} from "../lucky-wheel/lucky-wheel.localization";
import { LuckyWheelService } from "../lucky-wheel/lucky-wheel.service";

type EventRecord = Prisma.EventCampaignGetPayload<{
  include: {
    localizations: true;
    wheelSegments: { include: { localizations: true } };
    prizes: { include: { localizations: true } };
    platformLinks: { include: { localizations: true } };
    auditLogs: true;
  };
}>;

type EventCatalogRecord = Prisma.EventCampaignGetPayload<{
  include: { localizations: true };
}>;

type DatabaseClient = Prisma.TransactionClient | PrismaService;

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_AUDIT_PREVIEW_SIZE = 6;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly luckyWheelService: LuckyWheelService,
    private readonly eventFinalizationService: EventFinalizationService,
    private readonly merchantApiClientService: MerchantApiClientService,
  ) {}

  async getOverview(locale: AppLocale): Promise<AdminOverviewResponse> {
    const events = await this.prisma.eventCampaign.findMany({
      include: { localizations: true },
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
    });

    return {
      generatedAt: new Date().toISOString(),
      currentEventId:
        events.find((entry) => entry.status === EventStatus.Live)?.id ?? null,
      supportedLocales: getSupportedLocaleOptions(),
      events: events.map((entry) => this.toEventListItem(entry, locale)),
      services: [
        {
          key: "client",
          label: "Player Client",
          url: "http://localhost:3000",
          description: "Mobile-first Phaser client for the live Lucky Wheel event.",
        },
        {
          key: "server",
          label: "Lucky Wheel Server",
          url: "http://localhost:4000/api",
          description:
            "Authoritative server for events, spins, ranking, localization, and admin APIs.",
        },
        {
          key: "merchant-api",
          label: "Merchant API",
          url: this.merchantApiClientService.getBaseUrl(),
          description:
            "Customer-platform-facing launch gateway that brokers Lucky Wheel session creation.",
        },
        {
          key: "admin",
          label: "Admin Tool",
          url: "http://localhost:4002",
          description:
            "Operations workspace for event setup, wheel settings, prizes, rules, history, and audit.",
        },
      ],
      merchantApi: await this.getMerchantApiStatus(),
    };
  }

  async getEventDashboard(
    eventId: string,
    locale: AppLocale,
  ): Promise<AdminEventDashboardResponse> {
    const [event, leaderboard, player, prizes, recentSpins, metrics, localizationCoverage] =
      await Promise.all([
        this.luckyWheelService.getEvent(eventId, locale),
        this.luckyWheelService.getLeaderboard(eventId, 30, locale, false),
        this.luckyWheelService.getPlayer(eventId, locale, false),
        this.luckyWheelService.getPrizes(eventId, locale),
        this.prisma.spinTransaction.findMany({
          where: { eventCampaignId: eventId },
          include: { player: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        this.getMetrics(eventId),
        this.getLocalizationCoverage(eventId),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      event,
      leaderboard,
      player,
      prizes,
      metrics,
      recentSpins: recentSpins.map((entry) => ({
        id: entry.id,
        playerName: entry.player.displayName,
        createdAt: entry.createdAt.toISOString(),
        segmentIndex: entry.segmentIndex,
        segmentLabel: entry.segmentLabel,
        scoreDelta: entry.scoreDelta,
        runningEventTotal: entry.runningEventTotal,
      })),
      localizationCoverage,
      merchantApi: await this.getMerchantApiStatus(),
    };
  }

  async getEventEditor(
    eventId: string,
    _locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const [event, metrics, localizationCoverage, merchantApi, auditPreview] =
      await Promise.all([
        this.getEventRecordOrThrow(eventId),
        this.getMetrics(eventId),
        this.getLocalizationCoverage(eventId),
        this.getMerchantApiStatus(),
        this.getAuditPreview(eventId),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      event: this.toAdminEventConfig(event),
      metrics,
      localizationCoverage,
      merchantApi,
      auditPreview,
    };
  }

  async createEvent(
    request: AdminEventUpsertRequest,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    this.validateEventRequest(request);

    const eventId = `event-${randomUUID()}`;
    await this.assertNoOverlappingEvent(
      null,
      new Date(request.startAt),
      new Date(request.endAt),
      request.status,
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.eventCampaign.create({
        data: this.buildEventCreateInput(eventId, request),
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "create",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Created event ${request.code} with status ${request.status}.`,
        payloadJson: JSON.stringify({
          code: request.code,
          status: request.status,
        }),
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async updateEvent(
    eventId: string,
    request: AdminEventUpsertRequest,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    this.validateEventRequest(request);

    const existing = await this.getEventRecordOrThrow(eventId);
    if (existing.status === EventStatus.Finalized) {
      throw new BadRequestException("Finalized events are locked from editing.");
    }

    await this.assertNoOverlappingEvent(
      eventId,
      new Date(request.startAt),
      new Date(request.endAt),
      request.status,
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.wheelSegment.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.eventPrize.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.platformLink.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.eventCampaignLocalization.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: this.buildEventUpdateInput(eventId, request),
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "update",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Updated event ${request.code}.`,
        payloadJson: JSON.stringify({
          code: request.code,
          status: request.status,
        }),
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async updateEventTerms(
    eventId: string,
    request: AdminEventTermsUpdateRequest,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const event = await this.getEventRecordOrThrow(eventId);
    this.validateEventLocalizations(request.localizations);
    const englishContent = this.getEnglishLocalization(request.localizations);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.eventCampaignLocalization.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: {
          title: englishContent.title,
          shortDescription: englishContent.shortDescription,
          rulesContent: englishContent.rulesContent,
          promotionPeriodLabel: englishContent.promotionPeriodLabel,
          localizations: {
            create: this.buildEventLocalizationsCreateInput(
              eventId,
              request.localizations,
            ),
          },
        },
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "update_terms",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Updated terms and rules for event ${event.code}.`,
        payloadJson: JSON.stringify({
          locales: request.localizations.map((entry) => entry.locale),
        }),
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async updateEventPrizes(
    eventId: string,
    request: AdminEventPrizesUpdateRequest,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const event = await this.getEventRecordOrThrow(eventId);
    this.validatePrizeConfigs(request.prizes);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.eventPrize.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: {
          prizes: {
            create: this.buildPrizeCreateInput(eventId, request.prizes),
          },
        },
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "update_prizes",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Updated prize settings for event ${event.code}.`,
        payloadJson: JSON.stringify({
          prizeCount: request.prizes.length,
        }),
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async updateEventPlatformLinks(
    eventId: string,
    request: AdminPlatformLinksUpdateRequest,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const event = await this.getEventRecordOrThrow(eventId);
    this.validatePlatformLinks(request.platformLinks);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.platformLink.deleteMany({
        where: { eventCampaignId: eventId },
      });
      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: {
          platformLinks: {
            create: this.buildPlatformLinksCreateInput(
              eventId,
              request.platformLinks,
            ),
          },
        },
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "update_platform_links",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Updated platform links for event ${event.code}.`,
        payloadJson: JSON.stringify({
          linkTypes: request.platformLinks.map((entry) => entry.type),
        }),
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async publishEvent(
    eventId: string,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const event = await this.getEventRecordOrThrow(eventId);

    if (event.status === EventStatus.Cancelled || event.status === EventStatus.Finalized) {
      throw new BadRequestException(
        "Cancelled or finalized events cannot be published.",
      );
    }

    const nextStatus = this.resolvePublishedStatus(event.startAt, event.endAt);
    await this.assertNoOverlappingEvent(eventId, event.startAt, event.endAt, nextStatus);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: { status: nextStatus },
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "publish",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Published event ${event.code} as ${nextStatus}.`,
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async cancelEvent(
    eventId: string,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const event = await this.getEventRecordOrThrow(eventId);
    if (event.status === EventStatus.Finalized) {
      throw new BadRequestException("Finalized events cannot be cancelled.");
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.eventCampaign.update({
        where: { id: eventId },
        data: { status: EventStatus.Cancelled },
      });
      await this.createAuditLog(transaction, {
        eventCampaignId: eventId,
        action: "cancel",
        entityType: "event_campaign",
        entityId: eventId,
        summary: `Cancelled event ${event.code}.`,
      });
    });

    return this.getEventEditor(eventId, locale);
  }

  async finalizeEvent(
    eventId: string,
    locale: AppLocale,
  ): Promise<AdminEventEditorResponse> {
    const event = await this.getEventRecordOrThrow(eventId);
    if (event.status === EventStatus.Cancelled) {
      throw new BadRequestException("Cancelled events cannot be finalized.");
    }
    if (event.status === EventStatus.Finalized) {
      throw new BadRequestException("Event is already finalized.");
    }

    await this.eventFinalizationService.finalizeEvent(eventId, {
      trigger: "manual",
    });

    return this.getEventEditor(eventId, locale);
  }

  async getParticipants(
    eventId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<AdminParticipantsResponse> {
    await this.ensureEventExists(eventId);

    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const skip = (safePage - 1) * safePageSize;

    const [total, rows] = await Promise.all([
      this.prisma.playerEventScore.count({
        where: { eventCampaignId: eventId },
      }),
      this.prisma.playerEventScore.findMany({
        where: { eventCampaignId: eventId },
        include: { player: true },
        orderBy: [{ totalScore: "desc" }, { updatedAt: "asc" }],
        skip,
        take: safePageSize,
      }),
    ]);

    return {
      page: safePage,
      pageSize: safePageSize,
      total,
      items: rows.map((entry, index) => ({
        playerId: entry.playerId,
        playerName: entry.player.displayName,
        totalScore: entry.totalScore,
        rank: skip + index + 1,
        hasSpun: entry.hasSpun,
        updatedAt: entry.updatedAt.toISOString(),
      })),
    };
  }

  async getEligibilityRecords(
    eventId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<AdminEligibilityRecordsResponse> {
    const event = await this.prisma.eventCampaign.findUniqueOrThrow({
      where: { id: eventId },
      select: { id: true, status: true, timezone: true },
    });
    const eventStatus = this.parseEnumValue(
      EventStatus,
      event.status,
      "event status",
    );
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const skip = (safePage - 1) * safePageSize;
    const { start, end } = resolveCurrentDayWindow(event.timezone);

    const allScores = await this.prisma.playerEventScore.findMany({
      where: { eventCampaignId: eventId },
      include: { player: true },
      orderBy: [{ totalScore: "desc" }, { updatedAt: "asc" }],
    });
    const playerIds = allScores.map((entry) => entry.playerId);
    const spinRows =
      playerIds.length > 0
        ? await this.prisma.spinTransaction.findMany({
            where: {
              eventCampaignId: eventId,
              playerId: { in: playerIds },
              createdAt: {
                gte: start,
                lt: end,
              },
            },
            select: { playerId: true },
          })
        : [];

    const usedSpinCountByPlayer = new Map<string, number>();
    for (const row of spinRows) {
      usedSpinCountByPlayer.set(
        row.playerId,
        (usedSpinCountByPlayer.get(row.playerId) ?? 0) + 1,
      );
    }

    const snapshots = new Map(
      await Promise.all(
        allScores.map(async (entry) => {
          const snapshot = await this.resolveAdminEligibilitySnapshot(
            eventId,
            eventStatus,
            entry.playerId,
            usedSpinCountByPlayer.get(entry.playerId) ?? 0,
          );

          return [entry.playerId, snapshot] as const;
        }),
      ),
    );

    const summary = {
      playableNow: 0,
      alreadySpin: 0,
      goToDeposit: 0,
      eventEnded: 0,
    };

    for (const snapshot of snapshots.values()) {
      switch (snapshot.eligibilityStatus) {
        case EligibilityStatus.PlayableNow:
          summary.playableNow += 1;
          break;
        case EligibilityStatus.AlreadySpin:
          summary.alreadySpin += 1;
          break;
        case EligibilityStatus.GoToDeposit:
          summary.goToDeposit += 1;
          break;
        case EligibilityStatus.EventEnded:
        default:
          summary.eventEnded += 1;
          break;
      }
    }

    const pageItems = allScores.slice(skip, skip + safePageSize);

    return {
      page: safePage,
      pageSize: safePageSize,
      total: allScores.length,
      summary,
      items: pageItems.map((entry) => {
        const snapshot = snapshots.get(entry.playerId);
        if (!snapshot) {
          throw new NotFoundException(
            `Eligibility snapshot missing for player ${entry.playerId}.`,
          );
        }

        return {
          playerId: entry.playerId,
          playerName: entry.player.displayName,
          eventStatus,
          eligibilityStatus: snapshot.eligibilityStatus,
          grantedSpinCount: snapshot.grantedSpinCount,
          usedSpinCount: snapshot.usedSpinCount,
          remainingSpinCount: snapshot.remainingSpinCount,
          spinAllowanceSource: snapshot.spinAllowanceSource,
          updatedAt: entry.updatedAt.toISOString(),
        };
      }),
    };
  }

  async getSpinRecords(
    eventId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<AdminSpinRecordsResponse> {
    await this.ensureEventExists(eventId);

    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);

    const [total, rows] = await Promise.all([
      this.prisma.spinTransaction.count({
        where: { eventCampaignId: eventId },
      }),
      this.prisma.spinTransaction.findMany({
        where: { eventCampaignId: eventId },
        include: { player: true },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    return {
      page: safePage,
      pageSize: safePageSize,
      total,
      items: rows.map((entry) => ({
        id: entry.id,
        playerId: entry.playerId,
        playerName: entry.player.displayName,
        createdAt: entry.createdAt.toISOString(),
        segmentIndex: entry.segmentIndex,
        segmentLabel: entry.segmentLabel,
        scoreDelta: entry.scoreDelta,
        runningEventTotal: entry.runningEventTotal,
        rewardType: entry.rewardType,
        rewardValue: this.parseStoredRewardValue(entry.rewardValue),
      })),
    };
  }

  async getAuditLog(
    eventId: string,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  ): Promise<AdminAuditLogResponse> {
    await this.ensureEventExists(eventId);

    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);

    const [total, rows] = await Promise.all([
      this.prisma.adminAuditLog.count({
        where: { eventCampaignId: eventId },
      }),
      this.prisma.adminAuditLog.findMany({
        where: { eventCampaignId: eventId },
        orderBy: { createdAt: "desc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    return {
      page: safePage,
      pageSize: safePageSize,
      total,
      items: rows.map((entry) => this.toAuditLogDto(entry)),
    };
  }

  private buildEventCreateInput(
    eventId: string,
    request: AdminEventUpsertRequest,
  ): Prisma.EventCampaignCreateInput {
    const englishContent = this.getEnglishLocalization(request.localizations);

    return {
      id: eventId,
      code: request.code,
      siteCode: request.siteCode,
      status: request.status,
      title: englishContent.title,
      shortDescription: englishContent.shortDescription,
      rulesContent: englishContent.rulesContent,
      timezone: request.timezone,
      styleTheme: request.styleTheme,
      promotionPeriodLabel: englishContent.promotionPeriodLabel,
      startAt: new Date(request.startAt),
      endAt: new Date(request.endAt),
      countdownEndsAt: new Date(request.countdownEndsAt),
      localizations: {
        create: this.buildEventLocalizationsCreateInput(eventId, request.localizations),
      },
      wheelSegments: {
        create: request.wheelSegments
          .slice()
          .sort((left, right) => left.segmentIndex - right.segmentIndex)
          .map((entry) => {
            const rewardMetadata = this.resolveRewardMetadata(
              entry.scoreOperator,
              entry.scoreOperand,
            );

            return {
              id: `${eventId}-segment-${entry.segmentIndex}`,
              segmentIndex: entry.segmentIndex,
              label: this.getEnglishWheelLabel(entry.localizations),
              scoreOperator: entry.scoreOperator,
              scoreOperand: entry.scoreOperand,
              weightPercent: entry.weightPercent,
              displayAssetKey: entry.displayAssetKey,
              rewardType: rewardMetadata.rewardType,
              rewardValue: rewardMetadata.rewardValue,
              localizations: {
                create: entry.localizations.map((translation) => ({
                  id: `${eventId}-segment-${entry.segmentIndex}-${translation.locale}`,
                  locale: translation.locale,
                  label: translation.label,
                })),
              },
            };
          }),
      },
      prizes: {
        create: request.prizes
          .slice()
          .sort((left, right) => left.displayOrder - right.displayOrder)
          .map((entry, index) => {
            const englishPrize = this.getEnglishPrizeContent(entry.localizations);

            return {
              id: `${eventId}-prize-${index + 1}`,
              rankFrom: entry.rankFrom,
              rankTo: entry.rankTo,
              prizeLabel: englishPrize.prizeLabel,
              prizeDescription: englishPrize.prizeDescription,
              accentLabel: englishPrize.accentLabel ?? null,
              imageUrl: entry.imageUrl,
              displayOrder: entry.displayOrder,
              localizations: {
                create: entry.localizations.map((translation) => ({
                  id: `${eventId}-prize-${index + 1}-${translation.locale}`,
                  locale: translation.locale,
                  prizeLabel: translation.prizeLabel,
                  prizeDescription: translation.prizeDescription,
                  accentLabel: translation.accentLabel ?? null,
                })),
              },
            };
          }),
      },
      platformLinks: {
        create: this.buildPlatformLinksCreateInput(eventId, request.platformLinks),
      },
    };
  }

  private buildEventUpdateInput(
    eventId: string,
    request: AdminEventUpsertRequest,
  ): Prisma.EventCampaignUpdateInput {
    const createInput = this.buildEventCreateInput(eventId, request);

    return {
      code: request.code,
      siteCode: request.siteCode,
      status: request.status,
      title: createInput.title,
      shortDescription: createInput.shortDescription,
      rulesContent: createInput.rulesContent,
      timezone: request.timezone,
      styleTheme: request.styleTheme,
      promotionPeriodLabel: createInput.promotionPeriodLabel,
      startAt: new Date(request.startAt),
      endAt: new Date(request.endAt),
      countdownEndsAt: new Date(request.countdownEndsAt),
      localizations: createInput.localizations,
      wheelSegments: createInput.wheelSegments,
      prizes: createInput.prizes,
      platformLinks: createInput.platformLinks,
    };
  }

  private validateEventRequest(request: AdminEventUpsertRequest) {
    if (!request.code.trim()) {
      throw new BadRequestException("Event code is required.");
    }
    if (!request.siteCode.trim()) {
      throw new BadRequestException("Site code is required.");
    }
    if (!request.timezone.trim()) {
      throw new BadRequestException("Timezone is required.");
    }

    const startAt = new Date(request.startAt);
    const endAt = new Date(request.endAt);
    const countdownEndsAt = new Date(request.countdownEndsAt);

    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      Number.isNaN(countdownEndsAt.getTime())
    ) {
      throw new BadRequestException("Start, end, and countdown dates must be valid.");
    }
    if (startAt >= endAt) {
      throw new BadRequestException("Event end time must be after start time.");
    }
    if (countdownEndsAt < startAt || countdownEndsAt > endAt) {
      throw new BadRequestException(
        "Countdown end must be inside the event time range.",
      );
    }

    this.validateEventLocalizations(request.localizations);

    if (request.wheelSegments.length !== 6) {
      throw new BadRequestException("Wheel configuration must contain exactly 6 segments.");
    }

    const sortedSegments = request.wheelSegments
      .slice()
      .sort((left, right) => left.segmentIndex - right.segmentIndex);
    const totalWeight = sortedSegments.reduce(
      (sum, entry) => sum + entry.weightPercent,
      0,
    );

    if (totalWeight !== 100) {
      throw new BadRequestException("Wheel segment probabilities must total 100.");
    }

    sortedSegments.forEach((entry, index) => {
      if (entry.segmentIndex !== index) {
        throw new BadRequestException(
          "Wheel segment indexes must be consecutive from 0 to 5.",
        );
      }
      this.validateLocaleCollection(
        entry.localizations.map((translation) => translation.locale),
        `wheel segment ${index + 1} localizations`,
      );
    });

    this.validatePrizeConfigs(request.prizes);

    this.validatePlatformLinks(request.platformLinks);
  }

  private validatePrizeConfigs(
    prizes: Array<
      Pick<AdminEventUpsertRequest["prizes"][number], "rankFrom" | "rankTo" | "localizations">
    >,
  ) {
    if (prizes.length === 0) {
      throw new BadRequestException("At least one prize tier is required.");
    }

    prizes.forEach((entry, index) => {
      if (entry.rankFrom > entry.rankTo) {
        throw new BadRequestException(
          `Prize tier ${index + 1} has an invalid rank range.`,
        );
      }
      this.validateLocaleCollection(
        entry.localizations.map((translation) => translation.locale),
        `prize ${index + 1} localizations`,
      );
    });
  }

  private validateEventLocalizations(localizations: AdminEventLocalizationDto[]) {
    this.validateLocaleCollection(
      localizations.map((entry) => entry.locale),
      "event localizations",
    );
    this.getEnglishLocalization(localizations);
  }

  private validatePlatformLinks(
    platformLinks: AdminPlatformLinksUpdateRequest["platformLinks"],
  ) {
    if (platformLinks.length !== 2) {
      throw new BadRequestException(
        "Platform links must include deposit and customer service.",
      );
    }

    [PlatformLinkType.Deposit, PlatformLinkType.CustomerService].forEach((type) => {
      if (!platformLinks.some((entry) => entry.type === type)) {
        throw new BadRequestException(
          "Platform links must include deposit and customer service.",
        );
      }
    });

    platformLinks.forEach((entry) => {
      if (!entry.url.trim()) {
        throw new BadRequestException("Platform link URLs cannot be empty.");
      }
      this.validateLocaleCollection(
        entry.localizations.map((translation) => translation.locale),
        `${entry.type} localizations`,
      );
      this.getEnglishPlatformLabel(entry.localizations);
    });
  }

  private validateLocaleCollection(locales: AppLocale[], label: string) {
    const normalized = locales.slice().sort();
    const expected = SUPPORTED_LOCALES.slice().sort();

    if (
      normalized.length !== expected.length ||
      normalized.some((entry, index) => entry !== expected[index])
    ) {
      throw new BadRequestException(
        `${label} must contain exactly en, ms, and zh-CN.`,
      );
    }
  }

  private async assertNoOverlappingEvent(
    eventId: string | null,
    startAt: Date,
    endAt: Date,
    status: EventStatus,
  ) {
    if (status === EventStatus.Draft || status === EventStatus.Cancelled) {
      return;
    }

    const overlap = await this.prisma.eventCampaign.findFirst({
      where: {
        id: eventId ? { not: eventId } : undefined,
        status: { not: EventStatus.Cancelled },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlap) {
      throw new BadRequestException(
        `Event period overlaps with ${overlap.code}. Non-cancelled events may not overlap.`,
      );
    }
  }

  private async ensureEventExists(eventId: string) {
    const exists = await this.prisma.eventCampaign.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Unknown event: ${eventId}`);
    }
  }

  private async getEventRecordOrThrow(eventId: string): Promise<EventRecord> {
    const event = await this.prisma.eventCampaign.findUnique({
      where: { id: eventId },
      include: {
        localizations: true,
        wheelSegments: {
          include: { localizations: true },
          orderBy: { segmentIndex: "asc" },
        },
        prizes: {
          include: { localizations: true },
          orderBy: { displayOrder: "asc" },
        },
        platformLinks: {
          include: { localizations: true },
          orderBy: { displayOrder: "asc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Unknown event: ${eventId}`);
    }

    return event;
  }

  private toAdminEventConfig(event: EventRecord): AdminEventConfigDto {
    return {
      id: event.id,
      code: event.code,
      siteCode: event.siteCode,
      status: this.parseEnumValue(EventStatus, event.status, "event status"),
      timezone: event.timezone,
      styleTheme: event.styleTheme,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      countdownEndsAt: event.countdownEndsAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      localizations: SUPPORTED_LOCALES.map((locale) => {
        const translation =
          event.localizations.find((entry) => entry.locale === locale) ??
          event.localizations.find((entry) => entry.locale === "en");

        if (!translation) {
          throw new BadRequestException(
            `Missing localization for event ${event.id}.`,
          );
        }

        return {
          locale,
          title: translation.title,
          shortDescription: translation.shortDescription,
          rulesContent: translation.rulesContent,
          promotionPeriodLabel: translation.promotionPeriodLabel,
        };
      }),
      wheelSegments: event.wheelSegments.map((segment) => ({
        id: segment.id,
        segmentIndex: segment.segmentIndex,
        scoreOperator: this.parseEnumValue(
          WheelSegmentOperator,
          segment.scoreOperator,
          "wheel segment operator",
        ),
        scoreOperand: segment.scoreOperand,
        weightPercent: segment.weightPercent,
        displayAssetKey: segment.displayAssetKey,
        localizations: SUPPORTED_LOCALES.map((locale) => ({
          locale,
          label:
            segment.localizations.find((entry) => entry.locale === locale)?.label ??
            segment.label,
        })),
      })),
      prizes: event.prizes.map((prize) => ({
        id: prize.id,
        rankFrom: prize.rankFrom,
        rankTo: prize.rankTo,
        imageUrl: prize.imageUrl,
        displayOrder: prize.displayOrder,
        localizations: SUPPORTED_LOCALES.map((locale) => {
          const translation =
            prize.localizations.find((entry) => entry.locale === locale) ??
            prize.localizations.find((entry) => entry.locale === "en");

          return {
            locale,
            prizeLabel: translation?.prizeLabel ?? prize.prizeLabel,
            prizeDescription:
              translation?.prizeDescription ?? prize.prizeDescription,
            accentLabel: translation?.accentLabel ?? prize.accentLabel,
          };
        }),
      })),
      platformLinks: event.platformLinks.map((link) => ({
        id: link.id,
        type: this.parseEnumValue(
          PlatformLinkType,
          link.linkType,
          "platform link type",
        ),
        url: link.url,
        displayOrder: link.displayOrder,
        localizations: SUPPORTED_LOCALES.map((locale) => ({
          locale,
          label:
            link.localizations.find((entry) => entry.locale === locale)?.label ??
            link.label,
        })),
      })),
    };
  }

  private toEventListItem(event: EventCatalogRecord, locale: AppLocale) {
    const translation =
      event.localizations.find((entry) => entry.locale === locale) ??
      event.localizations.find((entry) => entry.locale === "en");

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

  private async getMetrics(eventId: string) {
    const [participantCount, totalSpins, scoreMetrics] = await Promise.all([
      this.prisma.playerEventScore.count({
        where: { eventCampaignId: eventId },
      }),
      this.prisma.spinTransaction.count({
        where: { eventCampaignId: eventId },
      }),
      this.prisma.playerEventScore.aggregate({
        where: { eventCampaignId: eventId },
        _avg: { totalScore: true },
        _max: { totalScore: true },
      }),
    ]);

    return {
      participantCount,
      totalSpins,
      topScore: scoreMetrics._max.totalScore ?? 0,
      averageScore: Math.round(scoreMetrics._avg.totalScore ?? 0),
    };
  }

  private async resolveAdminEligibilitySnapshot(
    eventId: string,
    eventStatus: EventStatus,
    playerId: string,
    usedSpinCount: number,
  ) {
    if (eventStatus !== EventStatus.Live) {
      const archivedAllowance = createArchivedDailySpinAllowance();

      return {
        eligibilityStatus: EligibilityStatus.EventEnded,
        grantedSpinCount: archivedAllowance.grantedSpinCount,
        usedSpinCount: archivedAllowance.usedSpinCount,
        remainingSpinCount: archivedAllowance.remainingSpinCount,
        spinAllowanceSource: archivedAllowance.spinAllowanceSource,
      };
    }

    try {
      const allowance = createServerDailySpinAllowance(usedSpinCount);
      const merchantEligibility = await this.merchantApiClientService.getEligibilitySnapshot(
        playerId,
        eventId,
      );
      const eligibilityStatus =
        !allowance.canSpinToday || allowance.remainingSpinCount <= 0
          ? EligibilityStatus.AlreadySpin
          : !merchantEligibility.depositQualified
            ? EligibilityStatus.GoToDeposit
            : EligibilityStatus.PlayableNow;

      return {
        eligibilityStatus,
        grantedSpinCount: allowance.grantedSpinCount,
        usedSpinCount: allowance.usedSpinCount,
        remainingSpinCount: allowance.remainingSpinCount,
        spinAllowanceSource: allowance.spinAllowanceSource,
      };
    } catch (error) {
      return {
        eligibilityStatus: EligibilityStatus.AlreadySpin,
        grantedSpinCount: 0,
        usedSpinCount: Math.max(0, usedSpinCount),
        remainingSpinCount: 0,
        spinAllowanceSource: "archive_snapshot" as const,
      };
    }
  }

  private async getLocalizationCoverage(
    eventId: string,
  ): Promise<AdminLocalizationCoverageDto[]> {
    const event = await this.prisma.eventCampaign.findUniqueOrThrow({
      where: { id: eventId },
      include: {
        localizations: true,
        prizes: { include: { localizations: true } },
        wheelSegments: { include: { localizations: true } },
        platformLinks: { include: { localizations: true } },
      },
    });

    return SUPPORTED_LOCALES.map((locale) => ({
      locale,
      eventContentComplete: event.localizations.some((entry) => entry.locale === locale),
      prizeContentComplete: event.prizes.every((entry) =>
        entry.localizations.some((translation) => translation.locale === locale),
      ),
      wheelLabelsComplete: event.wheelSegments.every((entry) =>
        entry.localizations.some((translation) => translation.locale === locale),
      ),
      platformLinksComplete: event.platformLinks.every((entry) =>
        entry.localizations.some((translation) => translation.locale === locale),
      ),
    }));
  }

  private async getAuditPreview(eventId: string): Promise<AdminAuditLogDto[]> {
    const rows = await this.prisma.adminAuditLog.findMany({
      where: { eventCampaignId: eventId },
      orderBy: { createdAt: "desc" },
      take: DEFAULT_AUDIT_PREVIEW_SIZE,
    });

    return rows.map((entry) => this.toAuditLogDto(entry));
  }

  private async createAuditLog(
    transaction: DatabaseClient,
    data: {
      eventCampaignId?: string | null;
      action: string;
      entityType: string;
      entityId: string;
      summary: string;
      payloadJson?: string;
    },
  ) {
    await transaction.adminAuditLog.create({
      data: {
        id: `audit-${randomUUID()}`,
        eventCampaignId: data.eventCampaignId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        summary: data.summary,
        payloadJson: data.payloadJson ?? null,
      },
    });
  }

  private toAuditLogDto(
    entry: Prisma.AdminAuditLogGetPayload<Record<string, never>>,
  ): AdminAuditLogDto {
    return {
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private resolvePublishedStatus(startAt: Date, endAt: Date): EventStatus {
    const now = new Date();
    if (now < startAt) {
      return EventStatus.Scheduled;
    }
    if (now <= endAt) {
      return EventStatus.Live;
    }
    return EventStatus.Ended;
  }

  private getEnglishLocalization(localizations: AdminEventLocalizationDto[]) {
    const english = localizations.find((entry) => entry.locale === "en");
    if (!english) {
      throw new BadRequestException("English localization is required.");
    }
    return english;
  }

  private getEnglishWheelLabel(
    localizations: AdminEventUpsertRequest["wheelSegments"][number]["localizations"],
  ) {
    const english = localizations.find((entry) => entry.locale === "en");
    if (!english) {
      throw new BadRequestException("English wheel segment label is required.");
    }
    return english.label;
  }

  private getEnglishPrizeContent(
    localizations: AdminEventUpsertRequest["prizes"][number]["localizations"],
  ) {
    const english = localizations.find((entry) => entry.locale === "en");
    if (!english) {
      throw new BadRequestException("English prize content is required.");
    }
    return english;
  }

  private getEnglishPlatformLabel(
    localizations: AdminEventUpsertRequest["platformLinks"][number]["localizations"],
  ) {
    const english = localizations.find((entry) => entry.locale === "en");
    if (!english) {
      throw new BadRequestException("English platform link label is required.");
    }
    return english.label;
  }

  private buildEventLocalizationsCreateInput(
    eventId: string,
    localizations: AdminEventLocalizationDto[],
  ) {
    return localizations.map((entry) => ({
      id: `${eventId}-locale-${entry.locale}`,
      locale: entry.locale,
      title: entry.title,
      shortDescription: entry.shortDescription,
      rulesContent: entry.rulesContent,
      promotionPeriodLabel: entry.promotionPeriodLabel,
    }));
  }

  private buildPlatformLinksCreateInput(
    eventId: string,
    platformLinks: AdminPlatformLinksUpdateRequest["platformLinks"],
  ) {
    return platformLinks
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((entry, index) => ({
        id: `${eventId}-platform-link-${index + 1}`,
        linkType: entry.type,
        label: this.getEnglishPlatformLabel(entry.localizations),
        url: entry.url,
        displayOrder: entry.displayOrder,
        localizations: {
          create: entry.localizations.map((translation) => ({
            id: `${eventId}-platform-link-${index + 1}-${translation.locale}`,
            locale: translation.locale,
            label: translation.label,
          })),
        },
      }));
  }

  private buildPrizeCreateInput(
    eventId: string,
    prizes: AdminEventPrizesUpdateRequest["prizes"],
  ) {
    return prizes
      .slice()
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((entry, index) => {
        const englishPrize = this.getEnglishPrizeContent(entry.localizations);

        return {
          id: `${eventId}-prize-${index + 1}`,
          rankFrom: entry.rankFrom,
          rankTo: entry.rankTo,
          prizeLabel: englishPrize.prizeLabel,
          prizeDescription: englishPrize.prizeDescription,
          accentLabel: englishPrize.accentLabel ?? null,
          imageUrl: entry.imageUrl,
          displayOrder: entry.displayOrder,
          localizations: {
            create: entry.localizations.map((translation) => ({
              id: `${eventId}-prize-${index + 1}-${translation.locale}`,
              locale: translation.locale,
              prizeLabel: translation.prizeLabel,
              prizeDescription: translation.prizeDescription,
              accentLabel: translation.accentLabel ?? null,
            })),
          },
        };
      });
  }

  private async getMerchantApiStatus(): Promise<MerchantApiStatusDto> {
    try {
      return await this.merchantApiClientService.getHealth();
    } catch (error) {
      return {
        service: "merchant-api",
        status: "degraded",
        upstreamSource: "customer_platform",
        updatedAt: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "Merchant API unavailable.",
      };
    }
  }

  private parseStoredRewardValue(value: string | null) {
    if (value === null) {
      return null;
    }
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? value : numericValue;
  }

  private resolveRewardMetadata(
    scoreOperator: WheelSegmentOperator,
    scoreOperand: number,
  ) {
    switch (scoreOperator) {
      case WheelSegmentOperator.Add:
        return {
          rewardType: "score",
          rewardValue: this.toStoredRewardValue(scoreOperand),
        };
      case WheelSegmentOperator.Subtract:
        return {
          rewardType: "score",
          rewardValue: this.toStoredRewardValue(-scoreOperand),
        };
      case WheelSegmentOperator.Multiply:
        return {
          rewardType: "multiplier",
          rewardValue: this.toStoredRewardValue(scoreOperand),
        };
      case WheelSegmentOperator.Divide:
        return {
          rewardType: "divider",
          rewardValue: this.toStoredRewardValue(scoreOperand),
        };
      case WheelSegmentOperator.Equals:
        return {
          rewardType: scoreOperand === 0 ? "reset" : "score",
          rewardValue: this.toStoredRewardValue(scoreOperand),
        };
      default:
        return {
          rewardType: "score",
          rewardValue: this.toStoredRewardValue(scoreOperand),
        };
    }
  }

  private toStoredRewardValue(value: string | number | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }

  private parseEnumValue<T extends string>(
    enumType: Record<string, T>,
    value: string,
    label: string,
  ): T {
    const allowedValues = Object.values(enumType);
    if (!allowedValues.includes(value as T)) {
      throw new BadRequestException(`Invalid ${label}: ${value}`);
    }
    return value as T;
  }
}
