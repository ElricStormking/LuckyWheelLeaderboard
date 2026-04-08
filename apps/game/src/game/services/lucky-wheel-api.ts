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
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [350, 900, 1800];

export class HttpRequestError extends Error {
  constructor(readonly status: number) {
    super(`Request failed with status ${status}`);
  }
}

export function isHttpUnauthorizedError(error: unknown): error is HttpRequestError {
  return error instanceof HttpRequestError && error.status === 401;
}

export class LuckyWheelApi {
  private locale: AppLocale = "en";
  private accessToken?: string;

  setLocale(locale: AppLocale) {
    this.locale = locale;
  }

  getLocale() {
    return this.locale;
  }

  setAccessToken(accessToken?: string) {
    this.accessToken = accessToken;
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
    const requestUrl = `${API_BASE_URL}/v2/events/${eventId}/realtime`;
    const url = new URL(requestUrl, window.location.href);
    url.searchParams.set("locale", this.locale);
    if (this.accessToken) {
      url.searchParams.set("accessToken", this.accessToken);
    }

    return new EventSource(
      url.toString(),
    );
  }

  private async request<T>(
    path: string,
    options: RequestInit & {
      eligibilityOverride?: EligibilityStatus;
      skipLocale?: boolean;
      retryable?: boolean;
    } = {},
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (options.eligibilityOverride) {
      headers.set("x-lucky-eligibility-override", options.eligibilityOverride);
    }

    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const method = (options.method ?? "GET").toUpperCase();
    const canRetry = options.retryable ?? (method === "GET" || method === "HEAD");
    const requestUrl = `${API_BASE_URL}${this.withLocale(path, options.skipLocale)}`;
    const maxAttempts = canRetry ? RETRY_DELAYS_MS.length + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const response = await fetch(requestUrl, {
          ...options,
          headers,
        });

        if (!response.ok) {
          throw new HttpRequestError(response.status);
        }

        return (await response.json()) as T;
      } catch (error) {
        const shouldRetry =
          canRetry &&
          attempt < maxAttempts - 1 &&
          this.isRetryableRequestError(error);

        if (!shouldRetry) {
          throw error instanceof Error ? error : new Error("Request failed.");
        }

        await this.delay(
          RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1],
        );
      }
    }

    throw new Error("Request failed.");
  }

  private withLocale(path: string, skipLocale = false) {
    if (skipLocale) {
      return path;
    }

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}locale=${encodeURIComponent(this.locale)}`;
  }

  private isRetryableRequestError(error: unknown) {
    if (error instanceof HttpRequestError) {
      return RETRYABLE_STATUS_CODES.has(error.status);
    }

    if (error instanceof DOMException) {
      return error.name !== "AbortError";
    }

    return error instanceof TypeError || error instanceof Error;
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
}

export type LuckyWheelRealtimeEventMap = {
  "event:statusChanged": EventStatusChangedEventDto;
  "event:countdownSync": CountdownSyncEventDto;
  "leaderboard:top30": LeaderboardTop30EventDto;
  "player:scoreChanged": PlayerScoreChangedEventDto;
  "player:rankChanged": PlayerRankChangedEventDto;
};
