import { Injectable } from "@nestjs/common";
import { MerchantEligibilityResponseDto } from "@lucky-wheel/contracts";

@Injectable()
export class CustomerPlatformService {
  private readonly depositRequiredPlayerIds = this.parsePlayerIds(
    process.env.CUSTOMER_PLATFORM_DEPOSIT_REQUIRED_PLAYER_IDS ?? "",
  );
  private readonly depositUrl =
    process.env.CUSTOMER_PLATFORM_DEPOSIT_URL ??
    "https://merchant.example.com/deposit";

  getEligibilitySnapshot(
    playerId: string,
    eventId: string,
  ): MerchantEligibilityResponseDto {
    const evaluatedAt = new Date();
    const expiresAt = new Date(evaluatedAt.getTime() + 15 * 60 * 1000);
    const depositQualified = !this.requiresDeposit(playerId);

    return {
      eventId,
      playerId,
      depositQualified,
      depositUrl: depositQualified
        ? undefined
        : `${this.depositUrl}?playerId=${encodeURIComponent(playerId)}&eventId=${encodeURIComponent(eventId)}`,
      reasonCode: depositQualified ? "DEPOSIT_RULE_PASSED" : "DEPOSIT_REQUIRED",
      decisionId: `cp_decision_${playerId}_${eventId}`,
      evaluatedAt: evaluatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      upstreamSource: "customer_platform",
      updatedAt: evaluatedAt.toISOString(),
    };
  }

  private requiresDeposit(playerId: string) {
    return (
      this.depositRequiredPlayerIds.has(playerId) ||
      playerId.toLowerCase().includes("deposit-required")
    );
  }

  private parsePlayerIds(value: string) {
    return new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }
}
