import { Body, Controller, Get, Headers, Param, Post, Query, Req, Sse } from "@nestjs/common";
import {
  EligibilityStatus,
  EventStatus,
  LuckyWheelPlayerSessionLaunchRequestDto,
  SpinRequest,
} from "@lucky-wheel/contracts";
import { LuckyWheelService } from "./lucky-wheel.service";
import { PlayerSessionService } from "./player-session.service";
import { resolveRequestedLocale } from "./lucky-wheel.localization";

@Controller("v2")
export class LuckyWheelController {
  constructor(
    private readonly luckyWheelService: LuckyWheelService,
    private readonly playerSessionService: PlayerSessionService,
  ) {}

  @Post("player/session/launch")
  launchPlayerSession(
    @Body() request: LuckyWheelPlayerSessionLaunchRequestDto,
    @Headers("x-merchant-id") merchantId?: string,
    @Headers("x-timestamp") timestamp?: string,
    @Headers("x-nonce") nonce?: string,
    @Headers("x-signature") signature?: string,
    @Req()
    httpRequest?: {
      rawBody?: Buffer;
      originalUrl?: string;
      method?: string;
    },
  ) {
    return this.playerSessionService.launchPlayerSession(request, {
      merchantId,
      timestamp,
      nonce,
      signature,
      rawBody: httpRequest?.rawBody?.toString("utf8") ?? JSON.stringify(request),
      method: httpRequest?.method,
      path: httpRequest?.originalUrl,
    });
  }

  @Get("config/localization")
  getLocalizationConfig(
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getLocalizationConfig(
      locale,
      localeHeader,
      acceptLanguage,
    );
  }

  @Get("events/current")
  getCurrentEvent(
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getCurrentEvent(
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events")
  listEvents(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.listEvents(
      parseEventStatusFilter(status),
      parsePositiveInt(page, 1),
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId")
  getEvent(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getEvent(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/leaderboard")
  getLeaderboard(
    @Param("eventId") eventId: string,
    @Query("limit") limit?: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getLeaderboard(
      eventId,
      parsePositiveInt(limit, 30),
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/prizes")
  getPrizes(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getPrizes(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/me")
  getPlayer(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getPlayer(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/me/history")
  getPlayerSpinHistory(
    @Param("eventId") eventId: string,
    @Query("page") page?: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getPlayerSpinHistory(
      eventId,
      parsePositiveInt(page, 1),
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("me/lucky-wheel/history/events")
  getPlayerEventHistory(
    @Query("page") page?: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getPlayerEventHistory(
      parsePositiveInt(page, 1),
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/eligibility")
  getEligibility(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-eligibility-override") eligibilityOverride?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getEligibility(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
      parseEligibilityOverride(eligibilityOverride),
    );
  }

  @Sse("events/:eventId/realtime")
  getRealtime(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.luckyWheelService.getRealtimeStream(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Post("spins")
  spin(
    @Body() request: SpinRequest,
    @Headers("x-lucky-eligibility-override") eligibilityOverride?: string,
  ) {
    return this.luckyWheelService.spin(
      request,
      parseEligibilityOverride(eligibilityOverride),
    );
  }
}

function parseEligibilityOverride(value?: string): EligibilityStatus | undefined {
  if (!value) {
    return undefined;
  }

  const allowedValues = Object.values(EligibilityStatus);
  return allowedValues.includes(value as EligibilityStatus)
    ? (value as EligibilityStatus)
    : undefined;
}

function parseEventStatusFilter(value?: string): EventStatus[] {
  if (!value) {
    return [EventStatus.Live, EventStatus.Ended, EventStatus.Finalized];
  }

  const allowedValues = Object.values(EventStatus);
  const values = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is EventStatus => allowedValues.includes(entry as EventStatus));

  return values.length > 0 ? values : [EventStatus.Live, EventStatus.Ended, EventStatus.Finalized];
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
