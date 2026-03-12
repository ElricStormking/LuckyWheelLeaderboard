import { Module } from "@nestjs/common";
import { MerchantApiController } from "./merchant-api.controller";
import { MerchantApiService } from "./merchant-api.service";

@Module({
  controllers: [MerchantApiController],
  providers: [MerchantApiService],
})
export class MerchantApiModule {}
