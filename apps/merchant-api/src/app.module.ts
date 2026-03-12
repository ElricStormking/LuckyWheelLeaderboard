import { Module } from "@nestjs/common";
import { MerchantApiModule } from "./modules/merchant-api/merchant-api.module";

@Module({
  imports: [MerchantApiModule],
})
export class AppModule {}
