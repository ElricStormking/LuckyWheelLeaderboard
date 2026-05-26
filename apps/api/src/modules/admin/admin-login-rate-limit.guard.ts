import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AdminRateLimitService } from "./admin-rate-limit.service";

type RateLimitResponse = {
  setHeader(name: string, value: string | number): void;
};

@Injectable()
export class AdminLoginRateLimitGuard implements CanActivate {
  constructor(private readonly adminRateLimitService: AdminRateLimitService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.method === "OPTIONS") {
      return true;
    }

    const result = this.adminRateLimitService.checkLogin(request);
    setRateLimitHeaders(context.switchToHttp().getResponse<RateLimitResponse>(), result);

    if (!result.allowed) {
      this.adminRateLimitService.reject(result);
    }

    return true;
  }
}

export function setRateLimitHeaders(
  response: RateLimitResponse,
  result: {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
  },
) {
  response.setHeader("X-RateLimit-Limit", result.limit);
  response.setHeader("X-RateLimit-Remaining", result.remaining);
  response.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    response.setHeader("Retry-After", result.retryAfterSeconds);
  }
}
