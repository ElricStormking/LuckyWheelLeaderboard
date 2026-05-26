import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

export type AdminRateLimitRequest = {
  method?: string;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  headers: {
    "x-forwarded-for"?: string | string[];
    "x-real-ip"?: string | string[];
  };
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
  resetAt: number;
};

@Injectable()
export class AdminRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private lastCleanupAt = 0;

  private readonly loginConfig: RateLimitConfig = {
    maxRequests: parsePositiveInt(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX, 10),
    windowMs:
      parsePositiveInt(process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS, 5 * 60) *
      1000,
  };
  private readonly adminConfig: RateLimitConfig = {
    maxRequests: parsePositiveInt(process.env.ADMIN_RATE_LIMIT_MAX, 600),
    windowMs: parsePositiveInt(process.env.ADMIN_RATE_LIMIT_WINDOW_SECONDS, 60) * 1000,
  };

  checkLogin(request: AdminRateLimitRequest): RateLimitResult {
    return this.check(`admin-login:${this.getClientIp(request)}`, this.loginConfig);
  }

  checkAdmin(request: AdminRateLimitRequest): RateLimitResult {
    return this.check(`admin-api:${this.getClientIp(request)}`, this.adminConfig);
  }

  reject(result: RateLimitResult): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Too many admin requests. Try again in ${result.retryAfterSeconds} seconds.`,
        error: "Too Many Requests",
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  getClientIp(request: AdminRateLimitRequest): string {
    const forwardedFor = this.firstHeaderValue(request.headers["x-forwarded-for"]);
    const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();
    return (
      firstForwardedIp ||
      this.firstHeaderValue(request.headers["x-real-ip"]) ||
      request.ip ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  private check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    this.cleanupExpiredBuckets(now);

    const existing = this.buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + config.windowMs,
          };

    bucket.count += 1;
    this.buckets.set(key, bucket);

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const remaining = Math.max(0, config.maxRequests - bucket.count);

    return {
      allowed: bucket.count <= config.maxRequests,
      retryAfterSeconds,
      limit: config.maxRequests,
      remaining,
      resetAt: bucket.resetAt,
    };
  }

  private cleanupExpiredBuckets(now: number) {
    if (now - this.lastCleanupAt < 60_000) {
      return;
    }

    this.lastCleanupAt = now;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private firstHeaderValue(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value;
  }
}

export function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
