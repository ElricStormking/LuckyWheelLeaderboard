import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  MERCHANT_API_SERVICE_TOKEN_DEFAULT,
  MERCHANT_API_SERVICE_TOKEN_ENV_VAR,
} from "@lucky-wheel/contracts";

interface MerchantApiRequest {
  headers?: Record<string, string | string[] | undefined>;
}

@Injectable()
export class MerchantApiInternalAuthGuard implements CanActivate {
  private readonly expectedToken =
    process.env[MERCHANT_API_SERVICE_TOKEN_ENV_VAR] ??
    MERCHANT_API_SERVICE_TOKEN_DEFAULT;

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<MerchantApiRequest>();
    const token = this.extractBearerToken(request.headers);

    if (!token) {
      throw new UnauthorizedException("Service bearer token is required.");
    }

    if (token !== this.expectedToken) {
      throw new UnauthorizedException("Service bearer token is invalid.");
    }

    return true;
  }

  private extractBearerToken(
    headers: Record<string, string | string[] | undefined> | undefined,
  ) {
    const authorization =
      headers?.authorization ??
      headers?.Authorization ??
      headers?.AUTHORIZATION;

    const headerValue = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (!headerValue) {
      return undefined;
    }

    const match = headerValue.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }
}
