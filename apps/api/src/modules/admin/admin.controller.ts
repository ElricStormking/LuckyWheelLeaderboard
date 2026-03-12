import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AdminEventUpsertRequest } from "@lucky-wheel/contracts";
import { resolveRequestedLocale } from "../lucky-wheel/lucky-wheel.localization";
import { AdminService } from "./admin.service";

@Controller("v2/admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  getOverview(
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.getOverview(
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/dashboard")
  getEventDashboard(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.getEventDashboard(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/editor")
  getEventEditor(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.getEventEditor(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Post("events")
  createEvent(
    @Body() request: AdminEventUpsertRequest,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.createEvent(
      request,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Patch("events/:eventId")
  updateEvent(
    @Param("eventId") eventId: string,
    @Body() request: AdminEventUpsertRequest,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.updateEvent(
      eventId,
      request,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Post("events/:eventId/publish")
  publishEvent(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.publishEvent(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Post("events/:eventId/cancel")
  cancelEvent(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.cancelEvent(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Post("events/:eventId/finalize")
  finalizeEvent(
    @Param("eventId") eventId: string,
    @Query("locale") locale?: string,
    @Headers("x-lucky-locale") localeHeader?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.adminService.finalizeEvent(
      eventId,
      resolveRequestedLocale(locale, localeHeader, acceptLanguage),
    );
  }

  @Get("events/:eventId/participants")
  getParticipants(
    @Param("eventId") eventId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminService.getParticipants(
      eventId,
      parsePositiveInt(page, 1),
      parsePositiveInt(pageSize, 12),
    );
  }

  @Get("events/:eventId/eligibility")
  getEligibilityRecords(
    @Param("eventId") eventId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminService.getEligibilityRecords(
      eventId,
      parsePositiveInt(page, 1),
      parsePositiveInt(pageSize, 12),
    );
  }

  @Get("events/:eventId/spins")
  getSpinRecords(
    @Param("eventId") eventId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminService.getSpinRecords(
      eventId,
      parsePositiveInt(page, 1),
      parsePositiveInt(pageSize, 12),
    );
  }

  @Get("events/:eventId/audit")
  getAuditLog(
    @Param("eventId") eventId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminService.getAuditLog(
      eventId,
      parsePositiveInt(page, 1),
      parsePositiveInt(pageSize, 12),
    );
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
