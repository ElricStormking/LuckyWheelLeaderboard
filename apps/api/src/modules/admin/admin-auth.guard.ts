import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AdminAuthService } from "./admin-auth.service";

type AdminRequest = {
  method?: string;
  headers: {
    authorization?: string | string[];
  };
};

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (request.method === "OPTIONS") {
      return true;
    }

    const token = this.getBearerToken(request.headers.authorization);
    if (!token || !this.adminAuthService.verifyToken(token)) {
      throw new UnauthorizedException("Admin login required.");
    }

    return true;
  }

  private getBearerToken(authorization?: string | string[]) {
    const value = Array.isArray(authorization) ? authorization[0] : authorization;
    const match = /^Bearer\s+(.+)$/i.exec(value ?? "");
    return match?.[1]?.trim();
  }
}
