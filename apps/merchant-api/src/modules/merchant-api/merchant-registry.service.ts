import { Injectable } from "@nestjs/common";
import { AppLocale } from "@lucky-wheel/contracts";

export interface MerchantRegistryRecord {
  merchantId: string;
  integrationGuid: string;
  platformSecret: string;
  active: boolean;
  allowedIps: string[];
}

@Injectable()
export class MerchantRegistryService {
  private readonly merchant: MerchantRegistryRecord = {
    merchantId: process.env.MERCHANT_INTEGRATION_ID?.trim() ?? "",
    integrationGuid:
      process.env.MERCHANT_INTEGRATION_GUID ??
      "11111111-1111-1111-1111-111111111111",
    platformSecret:
      process.env.LUCKY_WHEEL_PLATFORM_MERCHANT_SECRET ??
      "lucky-wheel-platform-secret-dev",
    active: process.env.MERCHANT_INTEGRATION_ACTIVE !== "false",
    allowedIps: this.parseAllowedIps(
      process.env.MERCHANT_INTEGRATION_ALLOWED_IPS ?? "*",
    ),
  };

  getConfiguredMerchant() {
    return this.merchant.merchantId ? this.merchant : undefined;
  }

  resolveLocale(locale?: string): AppLocale {
    switch (locale) {
      case "ms":
      case "zh-CN":
      case "en":
        return locale;
      default:
        return "en";
    }
  }

  isIpAllowed(merchant: MerchantRegistryRecord, clientIp?: string) {
    if (merchant.allowedIps.length === 0 || merchant.allowedIps.includes("*")) {
      return true;
    }

    const normalizedIp = this.normalizeIp(clientIp);
    if (!normalizedIp) {
      return false;
    }

    return merchant.allowedIps.some((allowedIp) => this.normalizeIp(allowedIp) === normalizedIp);
  }

  private parseAllowedIps(value: string) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private normalizeIp(value?: string) {
    if (!value) {
      return undefined;
    }

    const firstValue = value.split(",")[0]?.trim();
    if (!firstValue) {
      return undefined;
    }

    return firstValue.startsWith("::ffff:")
      ? firstValue.slice("::ffff:".length)
      : firstValue;
  }
}
