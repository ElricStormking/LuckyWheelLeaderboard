import { Module } from "@nestjs/common";
import { EventFinalizationService } from "./event-finalization.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { EventLifecycleService } from "./event-lifecycle.service";
import { LuckyWheelController } from "./lucky-wheel.controller";
import { MerchantApiClientService } from "./merchant-api-client.service";
import { LuckyWheelService } from "./lucky-wheel.service";
import { PlayerSessionService } from "./player-session.service";

@Module({
  imports: [PrismaModule],
  controllers: [LuckyWheelController],
  providers: [
    LuckyWheelService,
    PlayerSessionService,
    MerchantApiClientService,
    EventFinalizationService,
    EventLifecycleService,
  ],
  exports: [LuckyWheelService, MerchantApiClientService, EventFinalizationService],
})
export class LuckyWheelModule {}
