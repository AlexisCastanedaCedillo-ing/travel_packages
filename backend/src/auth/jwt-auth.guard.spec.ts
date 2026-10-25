import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '../database/entities/user.entity';

describe('JwtAuthGuard', () => {
  const validPayload: AuthenticatedUser & { iat: number; exp: number } = {
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'customer@example.test',
    role: UserRole.CUSTOMER,
    iat: 1,
    exp: 2,
  };

  function createContext(authorization?: string) {
    const request: {
      headers: { authorization?: string };
      user?: AuthenticatedUser;
    } = {
      headers: { authorization },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    return { context, request };
  }

  it('rejects absent or non-Bearer authorization headers', async () => {
    const verifyAsync = jest.fn();
    const jwt = { verifyAsync } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwt);

    await expect(
      guard.canActivate(createContext().context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(createContext('Basic abc').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(createContext('Bearer ').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('validates a token and attaches its user to the request', async () => {
    const verifyAsync = jest
      .fn<() => Promise<typeof validPayload>>()
      .mockResolvedValue(validPayload);
    const jwt = {
      verifyAsync,
    };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService);
    const { context, request } = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).toHaveBeenCalledWith('valid-token');
    expect(request.user).toEqual(validPayload);
  });

  it('rejects malformed payloads and expired or invalid tokens', async () => {
    const jwt = {
      verifyAsync: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce({ ...validPayload, role: 'visitor' })
        .mockRejectedValueOnce(new Error('expired')),
    };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService);

    await expect(
      guard.canActivate(createContext('Bearer malformed').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(createContext('Bearer expired').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
