import { Injectable } from "@nestjs/common";
import { MerchantEligibilityResponseDto } from "@lucky-wheel/contracts";
import { CustomerPlatformSoapClientService } from "./customer-platform-soap.client";

@Injectable()
export class CustomerPlatformService {
  private readonly depositRequiredPlayerIds = this.parsePlayerIds(
    process.env.CUSTOMER_PLATFORM_DEPOSIT_REQUIRED_PLAYER_IDS ?? "",
  );
  private readonly depositUrl =
    process.env.CUSTOMER_PLATFORM_DEPOSIT_URL ??
    "https://merchant.example.com/deposit";
  private readonly eligibilityTtlMs = this.parseInteger(
    process.env.CUSTOMER_PLATFORM_ELIGIBILITY_TTL_MS,
    15 * 60 * 1000,
  );

  constructor(
    private readonly customerPlatformSoapClient: CustomerPlatformSoapClientService,
  ) {}

  async getEligibilitySnapshot(
    playerId: string,
    eventId: string,
  ): Promise<MerchantEligibilityResponseDto> {
    if (this.customerPlatformSoapClient.isEnabled()) {
      return this.getLiveEligibilitySnapshot(playerId, eventId);
    }

    return this.getFixtureEligibilitySnapshot(playerId, eventId);
  }

  private async getLiveEligibilitySnapshot(
    playerId: string,
    eventId: string,
  ): Promise<MerchantEligibilityResponseDto> {
    const evaluatedAt = new Date();
    const expiresAt = new Date(evaluatedAt.getTime() + this.eligibilityTtlMs);
    const upstreamDecision =
      await this.customerPlatformSoapClient.fetchDepositEligibility(playerId);
    const depositQualified = upstreamDecision.isEligible;

    return {
      eventId,
      playerId,
      depositQualified,
      depositUrl: depositQualified
        ? undefined
        : upstreamDecision.depositUrl ?? this.buildDepositUrl(playerId, eventId),
      decisionId: `cp_live_${playerId}_${eventId}_${evaluatedAt.getTime()}`,
      evaluatedAt: evaluatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      upstreamSource: "customer_platform",
      updatedAt: evaluatedAt.toISOString(),
    };
  }

  private getFixtureEligibilitySnapshot(
    playerId: string,
    eventId: string,
  ): MerchantEligibilityResponseDto {
    const evaluatedAt = new Date();
    const expiresAt = new Date(evaluatedAt.getTime() + this.eligibilityTtlMs);
    const depositQualified = !this.requiresDeposit(playerId);

    return {
      eventId,
      playerId,
      depositQualified,
      depositUrl: depositQualified
        ? undefined
        : this.buildDepositUrl(playerId, eventId),
      decisionId: `cp_fixture_${playerId}_${eventId}`,
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

  private buildDepositUrl(playerId: string, eventId: string) {
    try {
      const url = new URL(this.depositUrl);
      url.searchParams.set("playerId", playerId);
      url.searchParams.set("eventId", eventId);
      return url.toString();
    } catch {
      const separator = this.depositUrl.includes("?") ? "&" : "?";
      return `${this.depositUrl}${separator}playerId=${encodeURIComponent(playerId)}&eventId=${encodeURIComponent(eventId)}`;
    }
  }

  private parseInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }
}
