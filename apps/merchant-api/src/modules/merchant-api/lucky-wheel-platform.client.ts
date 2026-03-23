import { createHash, createHmac, randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  LuckyWheelPlayerSessionLaunchRequestDto,
  LuckyWheelPlayerSessionLaunchResponseDto,
} from "@lucky-wheel/contracts";
import { MerchantRegistryRecord } from "./merchant-registry.service";

@Injectable()
export class LuckyWheelPlatformClientService {
  private readonly baseUrl = (
    process.env.LUCKY_WHEEL_PLATFORM_BASE_URL ?? "http://localhost:4000"
  ).replace(/\/+$/, "");

  async launchPlayerSession(
    merchant: MerchantRegistryRecord,
    payload: LuckyWheelPlayerSessionLaunchRequestDto,
  ): Promise<LuckyWheelPlayerSessionLaunchResponseDto> {
    const path = "/api/v2/player/session/launch";
    const requestBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomUUID();
    const bodyHash = createHash("sha256").update(requestBody).digest("hex");
    const canonicalRequest = [
      "POST",
      path,
      timestamp,
      nonce,
      bodyHash,
    ].join("\n");
    const signature = createHmac("sha256", merchant.platformSecret)
      .update(canonicalRequest)
      .digest("hex");

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Merchant-Id": merchant.merchantId,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorMessage = await this.safeReadBody(response);
      throw new ServiceUnavailableException(
        errorMessage
          ? `Lucky Wheel platform launch failed: ${errorMessage}`
          : `Lucky Wheel platform launch failed with status ${response.status}.`,
      );
    }

    return (await response.json()) as LuckyWheelPlayerSessionLaunchResponseDto;
  }

  private async safeReadBody(response: Response) {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }
}
