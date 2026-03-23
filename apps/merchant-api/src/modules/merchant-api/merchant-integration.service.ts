import { createHash, timingSafeEqual } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import {
  MerchantIntegrationLaunchRequestDto,
  MerchantIntegrationLaunchResponseDto,
} from "@lucky-wheel/contracts";
import { LuckyWheelPlatformClientService } from "./lucky-wheel-platform.client";
import { MerchantRegistryRecord, MerchantRegistryService } from "./merchant-registry.service";

const SUCCESS_CODE = 0;
const INVALID_SIGNATURE_CODE = 1001;
const TIMESTAMP_EXPIRED_CODE = 1002;
const MERCHANT_NOT_FOUND_CODE = 1003;
const MERCHANT_INACTIVE_CODE = 1004;
const IP_NOT_ALLOWED_CODE = 1005;
const INVALID_REQUEST_CODE = 4000;
const PLATFORM_LAUNCH_FAILED_CODE = 7001;

@Injectable()
export class MerchantIntegrationService {
  private readonly logger = new Logger(MerchantIntegrationService.name);
  private readonly timestampToleranceSec = this.parseTolerance(
    process.env.MERCHANT_INTEGRATION_TIMESTAMP_TOLERANCE_SEC,
  );

  constructor(
    private readonly merchantRegistryService: MerchantRegistryService,
    private readonly luckyWheelPlatformClientService: LuckyWheelPlatformClientService,
  ) {}

  async launchGame(
    request: MerchantIntegrationLaunchRequestDto,
    clientIp?: string,
  ): Promise<MerchantIntegrationLaunchResponseDto> {
    const merchant = this.merchantRegistryService.getMerchant(request.merchantId);
    if (!merchant) {
      return this.buildError(MERCHANT_NOT_FOUND_CODE, "Merchant ID not found.");
    }

    if (!merchant.active) {
      return this.buildError(MERCHANT_INACTIVE_CODE, "Merchant account is inactive.");
    }

    if (!this.merchantRegistryService.isIpAllowed(merchant, clientIp)) {
      return this.buildError(IP_NOT_ALLOWED_CODE, "Client IP is not allowed.");
    }

    const validationError = this.validateLaunchRequest(request, merchant);
    if (validationError) {
      return validationError;
    }

    try {
      const playerSession =
        await this.luckyWheelPlatformClientService.launchPlayerSession(merchant, {
          merchantPlayerId: request.playerId.trim(),
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
  ) {
    if (
      !request.merchantId?.trim() ||
      !request.playerId?.trim() ||
      !request.initialEligibility ||
      typeof request.initialEligibility.depositQualified !== "boolean" ||
      !request.hash?.trim()
    ) {
      return this.buildError(
        INVALID_REQUEST_CODE,
        "merchantId, playerId, initialEligibility, and hash are required.",
      );
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

    const expectedHash = this.generateLaunchHash(request, merchant.hashKey);
    if (!this.hashEquals(expectedHash, request.hash)) {
      return this.buildError(INVALID_SIGNATURE_CODE, "Signature verification failed.");
    }

    return undefined;
  }

  private generateLaunchHash(
    request: MerchantIntegrationLaunchRequestDto,
    hashKey: string,
  ) {
    const payload = [
      request.merchantId.trim(),
      request.playerId.trim(),
      request.timestamp.toString(),
      hashKey,
    ].join("&");

    return createHash("sha256").update(payload).digest("hex");
  }

  private hashEquals(expectedHash: string, actualHash: string) {
    const left = Buffer.from(expectedHash.toLowerCase(), "utf8");
    const right = Buffer.from(actualHash.trim().toLowerCase(), "utf8");

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
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
  }
}
