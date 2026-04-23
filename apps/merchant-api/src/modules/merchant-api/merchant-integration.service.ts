import { timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  MerchantIntegrationLaunchRequestDto,
  MerchantIntegrationLaunchResponseDto,
} from "@lucky-wheel/contracts";
import { LuckyWheelPlatformClientService } from "./lucky-wheel-platform.client";
import { MerchantRegistryRecord, MerchantRegistryService } from "./merchant-registry.service";

const SUCCESS_CODE = 0;
const INVALID_INTEGRATION_GUID_CODE = 1001;
const TIMESTAMP_EXPIRED_CODE = 1002;
const MERCHANT_INACTIVE_CODE = 1004;
const IP_NOT_ALLOWED_CODE = 1005;
const INVALID_REQUEST_CODE = 4000;
const PLATFORM_LAUNCH_FAILED_CODE = 7001;
const MAX_DEPOSIT_URL_LENGTH = 2048;

@Injectable()
export class MerchantIntegrationService {
  private readonly logger = new Logger(MerchantIntegrationService.name);
  private readonly timestampToleranceSec = this.parseTolerance(
    process.env.MERCHANT_INTEGRATION_TIMESTAMP_TOLERANCE_SEC,
  );
  private readonly allowedDepositUrlOrigins = this.parseAllowedDepositUrlOrigins(
    process.env.MERCHANT_INTEGRATION_ALLOWED_DEPOSIT_URL_ORIGINS ?? "",
  );

  constructor(
    private readonly merchantRegistryService: MerchantRegistryService,
    private readonly luckyWheelPlatformClientService: LuckyWheelPlatformClientService,
  ) {}

  async launchGame(
    request: MerchantIntegrationLaunchRequestDto,
    integrationGuid: string | undefined,
    clientIp?: string,
  ): Promise<MerchantIntegrationLaunchResponseDto> {
    const merchant = this.merchantRegistryService.getConfiguredMerchant();
    if (!merchant) {
      this.logger.error(
        "Merchant API launch is misconfigured: MERCHANT_INTEGRATION_ID is missing or invalid.",
      );
      return this.buildError(
        PLATFORM_LAUNCH_FAILED_CODE,
        "Lucky Wheel launch failed.",
      );
    }

    if (!merchant.active) {
      return this.buildError(MERCHANT_INACTIVE_CODE, "Merchant account is inactive.");
    }

    if (!this.merchantRegistryService.isIpAllowed(merchant, clientIp)) {
      return this.buildError(IP_NOT_ALLOWED_CODE, "Client IP is not allowed.");
    }

    const validationError = this.validateLaunchRequest(
      request,
      merchant,
      integrationGuid,
    );
    if (validationError) {
      return validationError;
    }

    const depositUrl = this.resolveLaunchDepositUrl(request);

    try {
      const playerSession =
        await this.luckyWheelPlatformClientService.launchPlayerSession(merchant, {
          merchantPlayerId: request.playerId.trim(),
          depositUrl,
          device: {
            platform: "web",
          },
        });

      return {
        success: true,
        errorCode: SUCCESS_CODE,
        errorMessage: "",
        data: {
          url: playerSession.launchUrl,
          sessionId: playerSession.sessionId,
          expiresAt: playerSession.expiresAt,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lucky Wheel launch failed.";
      this.logger.error(message);
      return this.buildError(PLATFORM_LAUNCH_FAILED_CODE, message);
    }
  }

  private validateLaunchRequest(
    request: MerchantIntegrationLaunchRequestDto,
    merchant: MerchantRegistryRecord,
    integrationGuid?: string,
  ) {
    if (
      !request.playerId?.trim() ||
      !request.initialEligibility ||
      typeof request.initialEligibility.depositQualified !== "boolean"
    ) {
      return this.buildError(
        INVALID_REQUEST_CODE,
        "playerId and initialEligibility are required.",
      );
    }

    const depositUrl = this.resolveLaunchDepositUrl(request);
    const depositUrlValidationError = this.validateDepositUrl(depositUrl);
    if (depositUrlValidationError) {
      return depositUrlValidationError;
    }

    if (!Number.isInteger(request.timestamp)) {
      return this.buildError(TIMESTAMP_EXPIRED_CODE, "Timestamp is invalid.");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const diff = nowSec - request.timestamp;
    if (diff < 0 || diff > this.timestampToleranceSec) {
      return this.buildError(
        TIMESTAMP_EXPIRED_CODE,
        "Timestamp is outside the allowed window.",
      );
    }

    if (!this.guidEquals(merchant.integrationGuid, integrationGuid)) {
      return this.buildError(
        INVALID_INTEGRATION_GUID_CODE,
        "Integration GUID is missing or invalid.",
      );
    }

    return undefined;
  }

  private resolveLaunchDepositUrl(request: MerchantIntegrationLaunchRequestDto) {
    return request.depositUrl?.trim() || request.DepositURL?.trim() || undefined;
  }

  private validateDepositUrl(depositUrl?: string) {
    if (!depositUrl) {
      return undefined;
    }

    const parsedUrl = this.parseAbsoluteHttpUrl(depositUrl);
    if (!parsedUrl) {
      return this.buildError(
        INVALID_REQUEST_CODE,
        "depositUrl must be an absolute http(s) URL.",
      );
    }

    if (
      this.allowedDepositUrlOrigins.size > 0 &&
      !this.allowedDepositUrlOrigins.has(parsedUrl.origin)
    ) {
      return this.buildError(
        INVALID_REQUEST_CODE,
        "depositUrl origin is not allowed.",
      );
    }

    return undefined;
  }

  private parseAbsoluteHttpUrl(value: string) {
    if (value.length > MAX_DEPOSIT_URL_LENGTH) {
      return null;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
      return null;
    }
  }

  private parseAllowedDepositUrlOrigins(value: string) {
    return new Set(
      value
        .split(",")
        .map((entry) => this.parseAbsoluteHttpUrl(entry.trim())?.origin)
        .filter((origin): origin is string => Boolean(origin)),
    );
  }

  private guidEquals(expectedGuid: string, actualGuid?: string) {
    if (!actualGuid?.trim()) {
      return false;
    }

    const left = Buffer.from(expectedGuid.trim().toLowerCase(), "utf8");
    const right = Buffer.from(actualGuid.trim().toLowerCase(), "utf8");

    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  }

  private buildError(
    errorCode: number,
    errorMessage: string,
  ): MerchantIntegrationLaunchResponseDto {
    return {
      success: false,
      errorCode,
      errorMessage,
      data: null,
    };
  }

  private parseTolerance(value?: string) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 300;
  }
}
