import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import {
  AdminRateLimitService,
  type AdminRateLimitRequest,
} from "./admin-rate-limit.service";
import { setRateLimitHeaders } from "./admin-login-rate-limit.guard";

type RateLimitResponse = {
  setHeader(name: string, value: string | number): void;
};

@Injectable()
export class AdminRateLimitGuard implements CanActivate {
  constructor(private readonly adminRateLimitService: AdminRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRateLimitRequest>();
    if (request.method === "OPTIONS") {
      return true;
    }

    const result = this.adminRateLimitService.checkAdmin(request);
    setRateLimitHeaders(context.switchToHttp().getResponse<RateLimitResponse>(), result);

    if (!result.allowed) {
      this.adminRateLimitService.reject(result);
    }

    return true;
  }
}
