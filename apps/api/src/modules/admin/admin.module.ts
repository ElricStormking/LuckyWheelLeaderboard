import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LuckyWheelModule } from "../lucky-wheel/lucky-wheel.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginRateLimitGuard } from "./admin-login-rate-limit.guard";
import { AdminRateLimitGuard } from "./admin-rate-limit.guard";
import { AdminRateLimitService } from "./admin-rate-limit.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminUploadController } from "./admin-upload.controller";
import { AdminUploadService } from "./admin-upload.service";

@Module({
  imports: [PrismaModule, LuckyWheelModule],
  controllers: [AdminAuthController, AdminController, AdminUploadController],
  providers: [
    AdminAuthGuard,
    AdminAuthService,
    AdminLoginRateLimitGuard,
    AdminRateLimitGuard,
    AdminRateLimitService,
    AdminService,
    AdminUploadService,
  ],
})
export class AdminModule {}
