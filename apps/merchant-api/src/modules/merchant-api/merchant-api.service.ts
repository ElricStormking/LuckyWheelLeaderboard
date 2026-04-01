import { Injectable } from "@nestjs/common";
import {
  MerchantApiStatusDto,
  MerchantEligibilityResponseDto,
} from "@lucky-wheel/contracts";
import { CustomerPlatformService } from "./customer-platform.service";

@Injectable()
export class MerchantApiService {
  constructor(
    private readonly customerPlatformService: CustomerPlatformService,
  ) {}

  getHealth(): MerchantApiStatusDto {
    return {
      service: "merchant-api",
      status: "online",
      upstreamSource: "customer_platform",
      updatedAt: new Date().toISOString(),
    };
  }

  async getEligibilitySnapshot(
    playerId: string,
    eventId: string,
  ): Promise<MerchantEligibilityResponseDto> {
    return this.customerPlatformService.getEligibilitySnapshot(playerId, eventId);
  }
}
