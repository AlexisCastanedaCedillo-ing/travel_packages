import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorReason } from '../common/error-reason';
import { ROLES_KEY } from './roles.decorator';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { UserRole } from '../database/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    if (!request.user || !roles.includes(request.user.role)) {
      throw new ForbiddenException(ErrorReason.Forbidden);
    }
    return true;
  }
}
