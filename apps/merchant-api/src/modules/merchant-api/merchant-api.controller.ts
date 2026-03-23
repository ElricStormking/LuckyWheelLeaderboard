import { Controller, Get, Param } from "@nestjs/common";
import { MerchantApiService } from "./merchant-api.service";

@Controller("v1")
export class MerchantApiController {
  constructor(private readonly merchantApiService: MerchantApiService) {}

  @Get("health")
  getHealth() {
    return this.merchantApiService.getHealth();
  }

  @Get("lucky-wheel/players/:playerId/events/:eventId/eligibility")
  getEligibilitySnapshot(
    @Param("playerId") playerId: string,
    @Param("eventId") eventId: string,
  ) {
    return this.merchantApiService.getEligibilitySnapshot(playerId, eventId);
  }
}
