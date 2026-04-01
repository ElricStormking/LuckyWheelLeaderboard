import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  MERCHANT_API_SERVICE_TOKEN_DEFAULT,
  MERCHANT_API_SERVICE_TOKEN_ENV_VAR,
  MerchantApiStatusDto,
  MerchantEligibilityResponseDto,
} from "@lucky-wheel/contracts";

@Injectable()
export class MerchantApiClientService {
  private readonly baseUrl =
    process.env.MERCHANT_API_BASE_URL ?? "http://localhost:4003/merchant-api";
  private readonly serviceToken =
    process.env[MERCHANT_API_SERVICE_TOKEN_ENV_VAR] ??
    MERCHANT_API_SERVICE_TOKEN_DEFAULT;

  getBaseUrl() {
    return this.baseUrl;
  }

  async getHealth(): Promise<MerchantApiStatusDto> {
    return this.request<MerchantApiStatusDto>("/v1/health");
  }

  async getEligibilitySnapshot(
    playerId: string,
    eventId: string,
  ): Promise<MerchantEligibilityResponseDto> {
    return this.request<MerchantEligibilityResponseDto>(
      `/v1/lucky-wheel/players/${encodeURIComponent(playerId)}/events/${encodeURIComponent(eventId)}/eligibility`,
    );
  }

  private async request<T>(pathname: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}${pathname}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.serviceToken}`,
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new ServiceUnavailableException(
          "Merchant API rejected the internal service bearer token.",
        );
      }

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Merchant API request failed with status ${response.status}.`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Merchant API unavailable: ${error.message}`
          : "Merchant API unavailable.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
