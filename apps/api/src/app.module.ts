import { Module } from "@nestjs/common";
import { AdminModule } from "./modules/admin/admin.module";
import { LuckyWheelModule } from "./modules/lucky-wheel/lucky-wheel.module";

@Module({
  imports: [LuckyWheelModule, AdminModule],
})
export class AppModule {}
