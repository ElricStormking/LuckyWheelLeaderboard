import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { MerchantApiService } from "./merchant-api.service";
import { MerchantApiInternalAuthGuard } from "./merchant-api-internal-auth.guard";

@Controller("v1")
@UseGuards(MerchantApiInternalAuthGuard)
export class MerchantApiController {
  constructor(private readonly merchantApiService: MerchantApiService) {}

  @Get("health")
  getHealth() {
    return this.merchantApiService.getHealth();
  }

  @Get("lucky-wheel/players/:playerId/events/:eventId/eligibility")
  async getEligibilitySnapshot(
    @Param("playerId") playerId: string,
    @Param("eventId") eventId: string,
  ) {
    return this.merchantApiService.getEligibilitySnapshot(playerId, eventId);
  }
}
