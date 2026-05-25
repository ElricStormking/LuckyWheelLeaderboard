import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LuckyWheelModule } from "../lucky-wheel/lucky-wheel.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminAuthService } from "./admin-auth.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminUploadController } from "./admin-upload.controller";
import { AdminUploadService } from "./admin-upload.service";

@Module({
  imports: [PrismaModule, LuckyWheelModule],
  controllers: [AdminAuthController, AdminController, AdminUploadController],
  providers: [AdminAuthGuard, AdminAuthService, AdminService, AdminUploadService],
})
export class AdminModule {}
