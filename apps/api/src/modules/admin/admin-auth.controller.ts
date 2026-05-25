import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminAuthService } from "./admin-auth.service";

type AdminLoginRequest = {
  username?: string;
  password?: string;
};

@Controller("v2/admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  login(@Body() request: AdminLoginRequest) {
    return this.adminAuthService.login(request.username, request.password);
  }

  @Get("session")
  @UseGuards(AdminAuthGuard)
  getSession() {
    return {
      username: this.adminAuthService.getUsername(),
    };
  }
}
