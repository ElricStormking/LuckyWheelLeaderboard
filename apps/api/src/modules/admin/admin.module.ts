import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LuckyWheelModule } from "../lucky-wheel/lucky-wheel.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PrismaModule, LuckyWheelModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
