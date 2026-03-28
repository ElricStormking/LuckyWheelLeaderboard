import { Body, Controller, Post, Req } from "@nestjs/common";
import { MerchantIntegrationLaunchRequestDto } from "@lucky-wheel/contracts";
import { MerchantIntegrationService } from "./merchant-integration.service";

@Controller("integration")
export class MerchantIntegrationController {
  constructor(
    private readonly merchantIntegrationService: MerchantIntegrationService,
  ) {}

  @Post("launch")
  launchGame(
    @Body() request: MerchantIntegrationLaunchRequestDto,
    @Req()
    httpRequest: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    return this.merchantIntegrationService.launchGame(
      request,
      this.resolveIntegrationGuid(httpRequest),
      this.resolveClientIp(httpRequest),
    );
  }

  private resolveIntegrationGuid(httpRequest: {
    headers?: Record<string, string | string[] | undefined>;
  }) {
    const headerValue = httpRequest.headers?.["x-integration-guid"];
    if (typeof headerValue === "string" && headerValue.trim()) {
      return headerValue;
    }

    if (Array.isArray(headerValue) && headerValue.length > 0) {
      return headerValue[0];
    }

    return undefined;
  }

  private resolveClientIp(httpRequest: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  }) {
    const forwardedFor = httpRequest.headers?.["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
      return forwardedFor;
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    return httpRequest.ip;
  }
}
