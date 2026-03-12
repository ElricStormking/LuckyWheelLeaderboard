import { Injectable } from "@nestjs/common";
import {
  MerchantApiStatusDto,
  MerchantEligibilityResponseDto,
} from "@lucky-wheel/contracts";

@Injectable()
export class MerchantApiService {
  getHealth(): MerchantApiStatusDto {
    return {
      service: "merchant-api",
      status: "online",
      upstreamSource: "customer_platform",
      updatedAt: new Date().toISOString(),
    };
  }

  getEligibilitySnapshot(
    eventId: string,
    playerId: string,
  ): MerchantEligibilityResponseDto {
    const snapshot = this.resolvePrototypeQuota(eventId, playerId);

    return {
      eventId,
      playerId,
      grantedSpinCount: snapshot.grantedSpinCount,
      requiresDeposit: snapshot.requiresDeposit,
      reasonCode: snapshot.reasonCode,
      upstreamSource: "customer_platform",
      updatedAt: new Date().toISOString(),
    };
  }

  private resolvePrototypeQuota(eventId: string, playerId: string) {
    if (playerId !== "player_demo_001") {
      return {
        grantedSpinCount: 1,
        requiresDeposit: false,
        reasonCode: "SPIN_QUOTA_GRANTED",
      };
    }

    switch (eventId) {
      case "evt_2026_march":
        return {
          grantedSpinCount: 7,
          requiresDeposit: false,
          reasonCode: "SPIN_QUOTA_GRANTED",
        };
      case "evt_2026_february":
      case "evt_2026_january":
        return {
          grantedSpinCount: 6,
          requiresDeposit: false,
          reasonCode: "ARCHIVE_SNAPSHOT",
        };
      default:
        return {
          grantedSpinCount: 1,
          requiresDeposit: false,
          reasonCode: "SPIN_QUOTA_GRANTED",
        };
    }
  }
}
