import type {
  AppLocale,
  CountdownSyncEventDto,
  CurrentEventResponse,
  EligibilityResponse,
  EligibilityStatus,
  EventCampaignDto,
  EventListResponse,
  EventPrizeDto,
  LeaderboardResponse,
  LeaderboardTop30EventDto,
  LocalizationConfigResponse,
  PlayerEventHistoryResponse,
  PlayerEventSummaryDto,
  PlayerRankChangedEventDto,
  PlayerScoreChangedEventDto,
  PlayerSpinHistoryResponse,
  SpinRequest,
  SpinResponse,
  EventStatusChangedEventDto,
} from "@lucky-wheel/contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class LuckyWheelApi {
  private locale: AppLocale = "en";

  setLocale(locale: AppLocale) {
    this.locale = locale;
  }

  getLocale() {
    return this.locale;
  }

  getLocalizationConfig(requestedLocale?: string) {
    const query = requestedLocale ? `?locale=${encodeURIComponent(requestedLocale)}` : "";
    return this.request<LocalizationConfigResponse>(`/v2/config/localization${query}`, {
      skipLocale: true,
    });
  }

  getCurrentEvent() {
    return this.request<CurrentEventResponse>("/v2/events/current");
  }

  getEvents(page = 1, statuses = "live,ended,finalized") {
    return this.request<EventListResponse>(`/v2/events?status=${statuses}&page=${page}`);
  }

  getEvent(eventId: string) {
    return this.request<EventCampaignDto>(`/v2/events/${eventId}`);
  }

  getLeaderboard(eventId: string) {
    return this.request<LeaderboardResponse>(`/v2/events/${eventId}/leaderboard?limit=30`);
  }

  getPrizes(eventId: string) {
    return this.request<EventPrizeDto[]>(`/v2/events/${eventId}/prizes`);
  }

  getPlayerSummary(eventId: string) {
    return this.request<PlayerEventSummaryDto>(`/v2/events/${eventId}/me`);
  }

  getPlayerSpinHistory(eventId: string, page = 1) {
    return this.request<PlayerSpinHistoryResponse>(
      `/v2/events/${eventId}/me/history?page=${page}`,
    );
  }

  getPlayerEventHistory(page = 1) {
    return this.request<PlayerEventHistoryResponse>(
      `/v2/me/lucky-wheel/history/events?page=${page}`,
    );
  }

  getEligibility(eventId: string, eligibilityOverride?: EligibilityStatus) {
    return this.request<EligibilityResponse>(
      `/v2/events/${eventId}/eligibility`,
      { eligibilityOverride },
    );
  }

  spin(payload: SpinRequest, eligibilityOverride?: EligibilityStatus) {
    return this.request<SpinResponse>(
      "/v2/spins",
      {
        method: "POST",
        body: JSON.stringify(payload),
        eligibilityOverride,
      },
    );
  }

  createRealtimeSource(eventId: string) {
    return new EventSource(
      `${API_BASE_URL}/v2/events/${eventId}/realtime?locale=${encodeURIComponent(this.locale)}`,
    );
  }

  private async request<T>(
    path: string,
    options: RequestInit & {
      eligibilityOverride?: EligibilityStatus;
      skipLocale?: boolean;
    } = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (options.eligibilityOverride) {
      headers.set("x-lucky-eligibility-override", options.eligibilityOverride);
    }

    const response = await fetch(`${API_BASE_URL}${this.withLocale(path, options.skipLocale)}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private withLocale(path: string, skipLocale = false) {
    if (skipLocale) {
      return path;
    }

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}locale=${encodeURIComponent(this.locale)}`;
  }
}

export type LuckyWheelRealtimeEventMap = {
  "event:statusChanged": EventStatusChangedEventDto;
  "event:countdownSync": CountdownSyncEventDto;
  "leaderboard:top30": LeaderboardTop30EventDto;
  "player:scoreChanged": PlayerScoreChangedEventDto;
  "player:rankChanged": PlayerRankChangedEventDto;
};
