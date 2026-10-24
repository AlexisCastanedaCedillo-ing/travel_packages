import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UserRole } from '../database/entities/user.entity';
import type { AuthenticatedUser } from './authenticated-user.interface';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<
        AuthenticatedUser & { iat: number; exp: number }
      >(token);
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        !Object.values(UserRole).includes(payload.role)
      ) {
        throw new UnauthorizedException('The bearer token payload is invalid');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('The bearer token is invalid or expired');
    }
  }
}
