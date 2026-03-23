import { Module } from "@nestjs/common";
import { CustomerPlatformService } from "./customer-platform.service";
import { LuckyWheelPlatformClientService } from "./lucky-wheel-platform.client";
import { MerchantIntegrationController } from "./merchant-integration.controller";
import { MerchantIntegrationService } from "./merchant-integration.service";
import { MerchantApiController } from "./merchant-api.controller";
import { MerchantApiService } from "./merchant-api.service";
import { MerchantRegistryService } from "./merchant-registry.service";

@Module({
  controllers: [MerchantApiController, MerchantIntegrationController],
  providers: [
    MerchantApiService,
    CustomerPlatformService,
    MerchantRegistryService,
    MerchantIntegrationService,
    LuckyWheelPlatformClientService,
  ],
})
export class MerchantApiModule {}
