import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../database/entities/user.entity';

describe('RolesGuard', () => {
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'agent@example.test',
    role: UserRole.AGENT,
  };

  function createGuard(
    roles: UserRole[] | undefined,
    requestUser?: AuthenticatedUser,
  ) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(roles),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: requestUser }) }),
    } as ExecutionContext;
    return { guard, context, reflector };
  }

  it('allows routes without role metadata', () => {
    const { guard, context } = createGuard(undefined, user);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user whose role is permitted', () => {
    const { guard, context } = createGuard(
      [UserRole.AGENT, UserRole.ADMIN],
      user,
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects missing users and users with a disallowed role', () => {
    const missingUser = createGuard([UserRole.ADMIN]);
    expect(() => missingUser.guard.canActivate(missingUser.context)).toThrow(
      ForbiddenException,
    );

    const wrongRole = createGuard([UserRole.CUSTOMER], user);
    expect(() => wrongRole.guard.canActivate(wrongRole.context)).toThrow(
      ForbiddenException,
    );
  });
});
