import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";

export type AdminLoginResponse = {
  token: string;
  username: string;
  expiresAt: string;
};

type AdminSessionPayload = {
  sub: "admin";
  username: string;
  iat: number;
  exp: number;
};

@Injectable()
export class AdminAuthService {
  private readonly username = process.env.ADMIN_USERNAME ?? "Admin";
  private readonly password = process.env.ADMIN_PASSWORD;
  private readonly secret =
    process.env.ADMIN_SESSION_SECRET ??
    process.env.LUCKY_WHEEL_PLATFORM_MERCHANT_SECRET ??
    "lucky-wheel-admin-session-dev-secret";
  private readonly sessionTtlSeconds = parsePositiveInt(
    process.env.ADMIN_SESSION_TTL_SECONDS,
    12 * 60 * 60,
  );

  login(username?: string, password?: string): AdminLoginResponse {
    if (!this.password) {
      throw new UnauthorizedException("Admin login is not configured.");
    }

    if (
      !this.safeCompare(username ?? "", this.username) ||
      !this.safeCompare(password ?? "", this.password)
    ) {
      throw new UnauthorizedException("Invalid admin credentials.");
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: AdminSessionPayload = {
      sub: "admin",
      username: this.username,
      iat: now,
      exp: now + this.sessionTtlSeconds,
    };
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(encodedPayload);

    return {
      token: `lw-admin.${encodedPayload}.${signature}`,
      username: this.username,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };
  }

  verifyToken(token: string): AdminSessionPayload | null {
    const [prefix, encodedPayload, signature] = token.split(".");
    if (prefix !== "lw-admin" || !encodedPayload || !signature) {
      return null;
    }

    if (!this.safeCompare(this.sign(encodedPayload), signature)) {
      return null;
    }

    try {
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as Partial<AdminSessionPayload>;
      const now = Math.floor(Date.now() / 1000);

      if (
        payload.sub !== "admin" ||
        payload.username !== this.username ||
        typeof payload.exp !== "number" ||
        payload.exp <= now
      ) {
        return null;
      }

      return payload as AdminSessionPayload;
    } catch {
      return null;
    }
  }

  getUsername() {
    return this.username;
  }

  private sign(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("base64url");
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private base64UrlDecode(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  private safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left, "utf8");
    const rightBuffer = Buffer.from(right, "utf8");
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
