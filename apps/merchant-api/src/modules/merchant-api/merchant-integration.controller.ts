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
      this.resolveClientIp(httpRequest),
    );
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
