import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  EventStatus,
  LuckyWheelPlayerSessionLaunchRequestDto,
  LuckyWheelPlayerSessionLaunchResponseDto,
} from "@lucky-wheel/contracts";
import { PrismaService } from "../../prisma/prisma.service";

interface LaunchRequestAuthContext {
  merchantId?: string;
  timestamp?: string;
  nonce?: string;
  signature?: string;
  rawBody: string;
  method?: string;
  path?: string;
}

export interface PlayerAccessTokenClaims {
  sub: string;
  merchantId: string;
  sessionId: string;
  scope: string;
  locale?: string;
  eventId?: string;
  depositUrl?: string;
  iat: number;
  exp: number;
  jti: string;
}

const MAX_DEPOSIT_URL_LENGTH = 2048;

@Injectable()
export class PlayerSessionService {
  private readonly expectedMerchantId =
    process.env.MERCHANT_INTEGRATION_ID ?? "MERCHANT001";
  private readonly expectedMerchantSecret =
    process.env.LUCKY_WHEEL_PLATFORM_MERCHANT_SECRET ??
    "lucky-wheel-platform-secret-dev";
  private readonly clientBaseUrl = (
    process.env.LUCKY_WHEEL_CLIENT_BASE_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");
  private readonly accessTokenTtlSec = this.parseTtl(
    process.env.LUCKY_WHEEL_ACCESS_TOKEN_TTL_SEC,
    15 * 60,
  );
  private readonly refreshTokenTtlSec = this.parseTtl(
    process.env.LUCKY_WHEEL_REFRESH_TOKEN_TTL_SEC,
    7 * 24 * 60 * 60,
  );
  private readonly timestampToleranceSec = this.parseTtl(
    process.env.LUCKY_WHEEL_MERCHANT_TIMESTAMP_TOLERANCE_SEC,
    300,
  );
  private readonly replayWindowMs = this.parseTtl(
    process.env.LUCKY_WHEEL_MERCHANT_NONCE_REPLAY_WINDOW_SEC,
    10 * 60,
  ) * 1000;
  private readonly nonceStore = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  async launchPlayerSession(
    request: LuckyWheelPlayerSessionLaunchRequestDto,
    auth: LaunchRequestAuthContext,
  ): Promise<LuckyWheelPlayerSessionLaunchResponseDto> {
    this.validateLaunchRequest(request);
    this.validateMerchantSignature(auth);
    const playerDisplayName =
      request.playerDisplayName?.trim() || request.merchantPlayerId.trim();
    const event = await this.resolveLaunchEvent(request.eventId);
    const depositUrl = this.normalizeDepositUrl(request.depositUrl);

    await this.prisma.player.upsert({
      where: {
        id: request.merchantPlayerId,
      },
      update: {
        displayName: playerDisplayName,
        externalUserId: request.merchantPlayerId,
      },
      create: {
        id: request.merchantPlayerId,
        externalUserId: request.merchantPlayerId,
        displayName: playerDisplayName,
        status: "active",
      },
    });

    const sessionId = `lw_sess_${randomUUID()}`;
    const accessToken = this.createSignedToken({
      sub: request.merchantPlayerId,
      merchantId: auth.merchantId ?? this.expectedMerchantId,
      sessionId,
      scope: "player",
      locale: request.locale,
      eventId: event.id,
      depositUrl,
    }, this.accessTokenTtlSec);
    const refreshToken = this.createSignedToken({
      sub: request.merchantPlayerId,
      merchantId: auth.merchantId ?? this.expectedMerchantId,
      sessionId,
      scope: "refresh",
      locale: request.locale,
      eventId: event.id,
      depositUrl,
    }, this.refreshTokenTtlSec);
    const expiresAt = new Date(Date.now() + this.accessTokenTtlSec * 1000).toISOString();
    const launchUrl = this.buildLaunchUrl(request, sessionId, event.id, accessToken);

    return {
      sessionId,
      launchUrl,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  private validateLaunchRequest(request: LuckyWheelPlayerSessionLaunchRequestDto) {
    if (!request.merchantPlayerId?.trim()) {
      throw new BadRequestException("merchantPlayerId is required.");
    }

    if (request.depositUrl && !this.normalizeDepositUrl(request.depositUrl)) {
      throw new BadRequestException("depositUrl must be an absolute http(s) URL.");
    }
  }

  private normalizeDepositUrl(depositUrl?: string) {
    const value = depositUrl?.trim();
    if (!value || value.length > MAX_DEPOSIT_URL_LENGTH) {
      return undefined;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.toString()
        : undefined;
    } catch {
      return undefined;
    }
  }

  private async resolveLaunchEvent(eventId?: string) {
    if (eventId?.trim()) {
      const event = await this.prisma.eventCampaign.findUnique({
        where: {
          id: eventId.trim(),
        },
      });

      if (!event) {
        throw new NotFoundException(`Unknown event: ${eventId}`);
      }

      return event;
    }

    const liveEvent = await this.prisma.eventCampaign.findFirst({
      where: {
        status: EventStatus.Live,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    if (!liveEvent) {
      throw new NotFoundException("No live Lucky Wheel event is available.");
    }

    return liveEvent;
  }

  private validateMerchantSignature(auth: LaunchRequestAuthContext) {
    if (
      !auth.merchantId?.trim() ||
      !auth.timestamp?.trim() ||
      !auth.nonce?.trim() ||
      !auth.signature?.trim()
    ) {
      throw new UnauthorizedException("Merchant signature headers are required.");
    }

    if (auth.merchantId !== this.expectedMerchantId) {
      throw new UnauthorizedException("Merchant ID is invalid.");
    }

    const timestampSec = Number(auth.timestamp);
    if (!Number.isInteger(timestampSec)) {
      throw new UnauthorizedException("Merchant timestamp is invalid.");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const diff = nowSec - timestampSec;
    if (diff < 0 || diff > this.timestampToleranceSec) {
      throw new UnauthorizedException("Merchant timestamp is outside the allowed window.");
    }

    const nonceKey = `${auth.merchantId}:${auth.nonce}`;
    this.cleanupNonceStore();
    const existingExpiry = this.nonceStore.get(nonceKey);
    if (existingExpiry && existingExpiry > Date.now()) {
      throw new ConflictException("Merchant nonce replay detected.");
    }

    const bodyHash = createHash("sha256").update(auth.rawBody).digest("hex");
    const canonicalRequest = [
      (auth.method ?? "POST").toUpperCase(),
      auth.path ?? "/api/v2/player/session/launch",
      auth.timestamp,
      auth.nonce,
      bodyHash,
    ].join("\n");
    const expectedSignature = createHmac("sha256", this.expectedMerchantSecret)
      .update(canonicalRequest)
      .digest("hex");

    if (!this.signatureEquals(expectedSignature, auth.signature)) {
      throw new UnauthorizedException("Merchant signature is invalid.");
    }

    this.nonceStore.set(nonceKey, Date.now() + this.replayWindowMs);
  }

  private cleanupNonceStore() {
    const now = Date.now();
    this.nonceStore.forEach((expiry, nonceKey) => {
      if (expiry <= now) {
        this.nonceStore.delete(nonceKey);
      }
    });
  }

  private signatureEquals(expectedSignature: string, actualSignature: string) {
    const expectedBuffer = Buffer.from(expectedSignature.toLowerCase(), "utf8");
    const actualBuffer = Buffer.from(actualSignature.trim().toLowerCase(), "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private createSignedToken(
    payload: Record<string, string | number | undefined>,
    ttlSec: number,
  ) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = {
      alg: "HS256",
      typ: "JWT",
    };
    const body = {
      ...payload,
      iat: issuedAt,
      exp: issuedAt + ttlSec,
      jti: randomUUID(),
    };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedBody = Buffer.from(JSON.stringify(body)).toString("base64url");
    const unsignedToken = `${encodedHeader}.${encodedBody}`;
    const signature = createHmac("sha256", this.expectedMerchantSecret)
      .update(unsignedToken)
      .digest("base64url");

    return `${unsignedToken}.${signature}`;
  }

  private buildLaunchUrl(
    request: LuckyWheelPlayerSessionLaunchRequestDto,
    sessionId: string,
    eventId: string,
    accessToken: string,
  ) {
    const url = new URL(this.clientBaseUrl);
    if (request.locale) {
      url.searchParams.set("lang", request.locale);
    }
    url.searchParams.set("eventId", eventId);
    url.searchParams.set("playerId", request.merchantPlayerId);
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("accessToken", accessToken);
    return url.toString();
  }

  resolvePlayerClaims(accessToken?: string) {
    if (!accessToken?.trim()) {
      return null;
    }

    const [encodedHeader, encodedBody, actualSignature] = accessToken.split(".");
    if (!encodedHeader || !encodedBody || !actualSignature) {
      throw new UnauthorizedException("Player access token is malformed.");
    }

    const unsignedToken = `${encodedHeader}.${encodedBody}`;
    const expectedSignature = createHmac("sha256", this.expectedMerchantSecret)
      .update(unsignedToken)
      .digest("base64url");

    if (!this.signatureEquals(expectedSignature, actualSignature)) {
      throw new UnauthorizedException("Player access token signature is invalid.");
    }

    let claims: PlayerAccessTokenClaims;
    try {
      claims = JSON.parse(
        Buffer.from(encodedBody, "base64url").toString("utf8"),
      ) as PlayerAccessTokenClaims;
    } catch {
      throw new UnauthorizedException("Player access token payload is invalid.");
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!claims.exp || claims.exp <= nowSec) {
      throw new UnauthorizedException("Player access token has expired.");
    }

    if (claims.scope !== "player") {
      throw new UnauthorizedException("Player access token scope is invalid.");
    }

    if (!claims.sub?.trim()) {
      throw new UnauthorizedException("Player access token subject is missing.");
    }

    return claims;
  }

  private parseTtl(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
