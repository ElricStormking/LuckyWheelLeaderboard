import { EligibilityStatus, type AppLocale } from "@lucky-wheel/contracts";
import type {
  CurrentEventResponse,
  EligibilityResponse,
  EventListItemDto,
  EventStatusChangedEventDto,
  EventPrizeDto,
  LeaderboardResponse,
  LeaderboardTop30EventDto,
  LocalizationOptionDto,
  PlayerEventHistoryResponse,
  PlayerEventSummaryDto,
  PlayerRankChangedEventDto,
  PlayerScoreChangedEventDto,
  PlayerSpinHistoryResponse,
  SpinSuccessResponse,
} from "@lucky-wheel/contracts";
import { FALLBACK_LOCALE, persistLocale, resolveLaunchLocale, translate } from "../i18n";
import { LuckyWheelApi, type LuckyWheelRealtimeEventMap } from "../services/lucky-wheel-api";

type RealtimeStatus = "idle" | "connecting" | "connected" | "error";

type Snapshot = {
  locale: AppLocale;
  supportedLocales: LocalizationOptionDto[];
  currentEvent: CurrentEventResponse["event"] | null;
  liveEventId: string | null;
  events: EventListItemDto[];
  player: PlayerEventSummaryDto | null;
  leaderboard: LeaderboardResponse | null;
  prizes: EventPrizeDto[];
  eligibility: EligibilityResponse | null;
  spinHistory: PlayerSpinHistoryResponse | null;
  eventHistory: PlayerEventHistoryResponse | null;
  spinHistoryPage: number;
  eventHistoryPage: number;
  realtimeStatus: RealtimeStatus;
  eligibilityOverride?: EligibilityStatus;
  isBootstrapping: boolean;
  isSpinning: boolean;
  errorMessage?: string;
  lastSpin?: SpinSuccessResponse;
};

class PrototypeState {
  private readonly api = new LuckyWheelApi();
  private readonly events = new EventTarget();
  private realtimeSource?: EventSource;
  private reconnectTimer?: number;
  private loadToken = 0;
  private snapshot: Snapshot = {
    locale: FALLBACK_LOCALE,
    supportedLocales: [],
    currentEvent: null,
    liveEventId: null,
    events: [],
    player: null,
    leaderboard: null,
    prizes: [],
    eligibility: null,
    spinHistory: null,
    eventHistory: null,
    spinHistoryPage: 1,
    eventHistoryPage: 1,
    realtimeStatus: "idle",
    eligibilityOverride: undefined,
    isBootstrapping: false,
    isSpinning: false,
    errorMessage: undefined,
    lastSpin: undefined,
  };

  getSnapshot() {
    return this.snapshot;
  }

  t(key: Parameters<typeof translate>[1], params?: Record<string, string | number>) {
    return translate(this.snapshot.locale, key, params);
  }

  subscribe(name: string, listener: EventListenerOrEventListenerObject) {
    this.events.addEventListener(name, listener);
    return () => this.events.removeEventListener(name, listener);
  }

  async bootstrap() {
    if (this.snapshot.isBootstrapping) {
      return;
    }

    const token = ++this.loadToken;
    this.disposeRealtime(false);
    this.snapshot = {
      ...this.snapshot,
      isBootstrapping: true,
      errorMessage: undefined,
    };
    this.emit("change");

    try {
      const localizationConfig = await this.api.getLocalizationConfig(resolveLaunchLocale());
      this.api.setLocale(localizationConfig.resolvedLocale);

      const [currentEvent, eventList, eventHistory] = await Promise.all([
        this.api.getCurrentEvent(),
        this.api.getEvents(),
        this.api.getPlayerEventHistory(1),
      ]);
      const eventId = currentEvent.event.id;
      const [leaderboard, prizes, eligibility, spinHistory] = await Promise.all([
        this.api.getLeaderboard(eventId),
        this.api.getPrizes(eventId),
        this.api.getEligibility(eventId, this.snapshot.eligibilityOverride),
        this.api.getPlayerSpinHistory(eventId, 1),
      ]);

      if (token !== this.loadToken) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        locale: localizationConfig.resolvedLocale,
        supportedLocales: localizationConfig.supportedLocales,
        currentEvent: currentEvent.event,
        liveEventId: eventList.currentEventId ?? currentEvent.event.id,
        events: eventList.items,
        player: currentEvent.player,
        leaderboard,
        prizes,
        eligibility,
        spinHistory,
        eventHistory,
        spinHistoryPage: 1,
        eventHistoryPage: 1,
        isBootstrapping: false,
      };
      persistLocale(localizationConfig.resolvedLocale);
      this.connectRealtime();
      this.emit("ready");
      this.emit("change");
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        isBootstrapping: false,
        errorMessage:
          error instanceof Error ? error.message : "Unable to load prototype data.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  async selectEvent(eventId: string) {
    if (this.snapshot.currentEvent?.id === eventId && !this.snapshot.isBootstrapping) {
      return;
    }

    const token = ++this.loadToken;
    this.disposeRealtime(false);
    this.snapshot = {
      ...this.snapshot,
      isBootstrapping: true,
      errorMessage: undefined,
      lastSpin: undefined,
    };
    this.emit("change");

    try {
      const [event, leaderboard, prizes, player, eligibility, spinHistory] =
        await Promise.all([
          this.api.getEvent(eventId),
          this.api.getLeaderboard(eventId),
          this.api.getPrizes(eventId),
          this.api.getPlayerSummary(eventId),
          this.api.getEligibility(eventId, this.snapshot.eligibilityOverride),
          this.api.getPlayerSpinHistory(eventId, 1),
        ]);
      const eventHistory =
        this.snapshot.eventHistory ??
        (await this.api.getPlayerEventHistory(this.snapshot.eventHistoryPage));

      if (token !== this.loadToken) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        currentEvent: event,
        player,
        leaderboard,
        prizes,
        eligibility,
        spinHistory,
        eventHistory,
        spinHistoryPage: 1,
        isBootstrapping: false,
      };
      this.connectRealtime();
      this.emit("change");
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        isBootstrapping: false,
        errorMessage:
          error instanceof Error ? error.message : "Unable to switch event.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  async setEligibilityOverride(eligibilityOverride?: EligibilityStatus) {
    this.snapshot = {
      ...this.snapshot,
      eligibilityOverride,
    };
    this.emit("change");

    if (!this.snapshot.currentEvent) {
      return;
    }

    try {
      const eligibility = await this.api.getEligibility(
        this.snapshot.currentEvent.id,
        eligibilityOverride,
      );
      this.snapshot = {
        ...this.snapshot,
        eligibility,
      };
      this.emit("change");
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        errorMessage:
          error instanceof Error ? error.message : "Unable to update eligibility state.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  async setLocale(locale: AppLocale) {
    if (locale === this.snapshot.locale && this.snapshot.currentEvent) {
      return;
    }

    const token = ++this.loadToken;
    this.disposeRealtime(false);
    this.snapshot = {
      ...this.snapshot,
      isBootstrapping: true,
      errorMessage: undefined,
    };
    this.emit("change");

    try {
      const localizationConfig = await this.api.getLocalizationConfig(locale);
      this.api.setLocale(localizationConfig.resolvedLocale);
      const targetEventId = this.snapshot.currentEvent?.id;
      const [eventList, eventHistory] = await Promise.all([
        this.api.getEvents(),
        this.api.getPlayerEventHistory(this.snapshot.eventHistoryPage),
      ]);

      const selectedEventId = targetEventId ?? eventList.currentEventId;
      if (!selectedEventId) {
        throw new Error("No event available for the selected locale.");
      }

      const [event, leaderboard, prizes, player, eligibility, spinHistory] =
        await Promise.all([
          this.api.getEvent(selectedEventId),
          this.api.getLeaderboard(selectedEventId),
          this.api.getPrizes(selectedEventId),
          this.api.getPlayerSummary(selectedEventId),
          this.api.getEligibility(selectedEventId, this.snapshot.eligibilityOverride),
          this.api.getPlayerSpinHistory(selectedEventId, this.snapshot.spinHistoryPage),
        ]);

      if (token !== this.loadToken) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        locale: localizationConfig.resolvedLocale,
        supportedLocales: localizationConfig.supportedLocales,
        currentEvent: event,
        liveEventId: eventList.currentEventId,
        events: eventList.items,
        player,
        leaderboard,
        prizes,
        eligibility,
        spinHistory,
        eventHistory,
        isBootstrapping: false,
      };
      persistLocale(localizationConfig.resolvedLocale);
      this.connectRealtime();
      this.emit("locale-change", localizationConfig.resolvedLocale);
      this.emit("change");
    } catch (error) {
      if (token !== this.loadToken) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        isBootstrapping: false,
        errorMessage:
          error instanceof Error ? error.message : "Unable to switch language.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  async setSpinHistoryPage(page: number) {
    const currentEvent = this.snapshot.currentEvent;
    if (!currentEvent) {
      return;
    }

    try {
      const spinHistory = await this.api.getPlayerSpinHistory(currentEvent.id, page);
      if (currentEvent.id !== this.snapshot.currentEvent?.id) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        spinHistory,
        spinHistoryPage: page,
      };
      this.emit("change");
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        errorMessage:
          error instanceof Error ? error.message : "Unable to load spin history.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  async setEventHistoryPage(page: number) {
    try {
      const eventHistory = await this.api.getPlayerEventHistory(page);
      this.snapshot = {
        ...this.snapshot,
        eventHistory,
        eventHistoryPage: page,
      };
      this.emit("change");
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        errorMessage:
          error instanceof Error ? error.message : "Unable to load event history.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  async spin() {
    const currentEvent = this.snapshot.currentEvent;

    if (!currentEvent || !this.snapshot.eligibility || this.snapshot.isSpinning) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      isSpinning: true,
      errorMessage: undefined,
    };
    this.emit("spin-start");
    this.emit("change");

    try {
      const response = await this.api.spin(
        {
          eventId: currentEvent.id,
          idempotencyKey: crypto.randomUUID(),
        },
        this.snapshot.eligibilityOverride,
      );

      if (!response.success) {
        const eligibility = await this.api.getEligibility(
          currentEvent.id,
          this.snapshot.eligibilityOverride,
        );
        this.snapshot = {
          ...this.snapshot,
          eligibility,
          isSpinning: false,
        };
        this.emit("change");
        return;
      }

      const [leaderboard, player, eligibility, spinHistory] = await Promise.all([
        this.api.getLeaderboard(currentEvent.id),
        this.api.getPlayerSummary(currentEvent.id),
        this.api.getEligibility(currentEvent.id, this.snapshot.eligibilityOverride),
        this.api.getPlayerSpinHistory(currentEvent.id, 1),
      ]);

      if (currentEvent.id !== this.snapshot.currentEvent?.id) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        leaderboard,
        player,
        eligibility,
        spinHistory,
        spinHistoryPage: 1,
        isSpinning: false,
        lastSpin: response,
      };
      this.emit("change");
      this.emit("spin-result", response);
    } catch (error) {
      this.snapshot = {
        ...this.snapshot,
        isSpinning: false,
        errorMessage:
          error instanceof Error ? error.message : "Unable to complete spin.",
      };
      this.emit("change");
      this.emit("error");
    }
  }

  acknowledgeSpinResult() {
    this.snapshot = {
      ...this.snapshot,
      lastSpin: undefined,
    };
  }

  clearError() {
    this.snapshot = {
      ...this.snapshot,
      errorMessage: undefined,
    };
    this.emit("change");
  }

  private connectRealtime() {
    const currentEvent = this.snapshot.currentEvent;
    this.disposeRealtime(false);

    if (!currentEvent || currentEvent.status !== "live") {
      this.setRealtimeStatus("idle");
      return;
    }

    const realtimeSource = this.api.createRealtimeSource(currentEvent.id);
    this.realtimeSource = realtimeSource;
    this.setRealtimeStatus("connecting");

    realtimeSource.onopen = () => {
      if (this.realtimeSource !== realtimeSource) {
        return;
      }

      this.setRealtimeStatus("connected");
    };

    realtimeSource.onerror = () => {
      if (this.realtimeSource !== realtimeSource) {
        return;
      }

      realtimeSource.close();
      this.realtimeSource = undefined;
      this.setRealtimeStatus("error");
      this.scheduleRealtimeReconnect(currentEvent.id);
    };

    realtimeSource.addEventListener("leaderboard:top30", (event) => {
      const payload = this.parseRealtimePayload<"leaderboard:top30">(event);
      if (payload.eventId !== this.snapshot.currentEvent?.id) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        leaderboard: payload.leaderboard,
      };
      this.emit("change");
    });

    realtimeSource.addEventListener("player:scoreChanged", (event) => {
      const payload = this.parseRealtimePayload<"player:scoreChanged">(event);
      if (payload.eventId !== this.snapshot.currentEvent?.id || !this.snapshot.player) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        player: {
          ...this.snapshot.player,
          totalScore: payload.totalScore,
          rank: payload.rank,
          prizeName: payload.prizeName,
          isTop30: payload.rank !== null && payload.rank <= 30,
          hasSpun: payload.hasSpun,
          grantedSpinCount: payload.grantedSpinCount,
          usedSpinCount: payload.usedSpinCount,
          remainingSpinCount: payload.remainingSpinCount,
          spinAllowanceSource: payload.spinAllowanceSource,
        },
      };

      this.emit("change");
      void this.refreshEligibilityOnly(payload.eventId);
      void this.refreshSpinHistorySilently(payload.eventId);
    });

    realtimeSource.addEventListener("player:rankChanged", (event) => {
      const payload = this.parseRealtimePayload<"player:rankChanged">(event);
      if (payload.eventId !== this.snapshot.currentEvent?.id) {
        return;
      }

      this.emit("rank-change", payload);
    });

    realtimeSource.addEventListener("event:statusChanged", (event) => {
      const payload = this.parseRealtimePayload<"event:statusChanged">(event);
      this.applyRealtimeEventStatus(payload);
    });
  }

  private applyRealtimeEventStatus(payload: EventStatusChangedEventDto) {
    const events = this.snapshot.events.map((entry) =>
      entry.id === payload.eventId ? { ...entry, status: payload.status } : entry,
    );
    const currentEvent =
      this.snapshot.currentEvent?.id === payload.eventId
        ? { ...this.snapshot.currentEvent, status: payload.status }
        : this.snapshot.currentEvent;

    this.snapshot = {
      ...this.snapshot,
      currentEvent,
      events,
    };

    if (payload.status !== "live") {
      this.disposeRealtime(false);
      this.setRealtimeStatus("idle");
      void this.refreshEventSummarySilently(payload.eventId);
      void this.refreshEligibilityOnly(payload.eventId);
    }

    this.emit("change");
  }

  private async refreshEligibilityOnly(eventId: string) {
    if (this.snapshot.currentEvent?.id !== eventId) {
      return;
    }

    try {
      const eligibility = await this.api.getEligibility(
        eventId,
        this.snapshot.eligibilityOverride,
      );
      if (this.snapshot.currentEvent?.id !== eventId) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        eligibility,
      };
      this.emit("change");
    } catch {
      // Ignore background refresh errors for realtime transitions.
    }
  }

  private async refreshSpinHistorySilently(eventId: string) {
    try {
      const spinHistory = await this.api.getPlayerSpinHistory(
        eventId,
        this.snapshot.spinHistoryPage,
      );
      if (this.snapshot.currentEvent?.id !== eventId) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        spinHistory,
      };
      this.emit("change");
    } catch {
      // Ignore background refresh errors for realtime updates.
    }
  }

  private async refreshEventSummarySilently(eventId: string) {
    try {
      const [leaderboard, player] = await Promise.all([
        this.api.getLeaderboard(eventId),
        this.api.getPlayerSummary(eventId),
      ]);
      if (this.snapshot.currentEvent?.id !== eventId) {
        return;
      }

      this.snapshot = {
        ...this.snapshot,
        leaderboard,
        player,
      };
      this.emit("change");
    } catch {
      // Ignore background refresh errors for realtime transitions.
    }
  }

  private scheduleRealtimeReconnect(eventId: string) {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = window.setTimeout(() => {
      if (this.snapshot.currentEvent?.id === eventId) {
        this.connectRealtime();
      }
    }, 2500);
  }

  private disposeRealtime(emitChange = true) {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.realtimeSource) {
      this.realtimeSource.close();
      this.realtimeSource = undefined;
    }

    if (emitChange) {
      this.setRealtimeStatus("idle");
    }
  }

  private setRealtimeStatus(status: RealtimeStatus) {
    if (this.snapshot.realtimeStatus === status) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      realtimeStatus: status,
    };
    this.emit("change");
  }

  private parseRealtimePayload<TName extends keyof LuckyWheelRealtimeEventMap>(event: Event) {
    return JSON.parse((event as MessageEvent<string>).data) as LuckyWheelRealtimeEventMap[TName];
  }

  private emit(name: string, detail?: unknown) {
    this.events.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

export const prototypeState = new PrototypeState();
