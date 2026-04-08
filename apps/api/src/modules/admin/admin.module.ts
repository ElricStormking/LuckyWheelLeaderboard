import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LuckyWheelModule } from "../lucky-wheel/lucky-wheel.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminUploadController } from "./admin-upload.controller";
import { AdminUploadService } from "./admin-upload.service";

@Module({
  imports: [PrismaModule, LuckyWheelModule],
  controllers: [AdminController, AdminUploadController],
  providers: [AdminService, AdminUploadService],
})
export class AdminModule {}
