import {
  ExecutionContext,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { RedisService } from '../infrastructure/redis.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

describe('AuthRateLimitGuard', () => {
  function createGuard(
    attempt: number | Error,
    ip?: string,
    remoteAddress?: string,
  ) {
    const evalCommand = jest.fn<() => Promise<number>>();
    if (attempt instanceof Error) {
      evalCommand.mockRejectedValue(attempt);
    } else {
      evalCommand.mockResolvedValue(attempt);
    }
    const guard = new AuthRateLimitGuard({
      client: { eval: evalCommand },
    } as unknown as RedisService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip, socket: { remoteAddress } }),
      }),
    } as ExecutionContext;
    return { guard, context, evalCommand };
  }

  it('allows requests within the limit and keys the counter by client IP', async () => {
    const { guard, context, evalCommand } = createGuard(5, '192.0.2.10');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evalCommand).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'auth:login:192.0.2.10',
      60,
    );
  });

  it('uses the socket address when the request IP is not set', async () => {
    const { guard, context, evalCommand } = createGuard(
      1,
      undefined,
      '127.0.0.1',
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evalCommand).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'auth:login:127.0.0.1',
      60,
    );
  });

  it('rejects attempts above the configured threshold', async () => {
    const { guard, context } = createGuard(6, undefined, undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('fails closed when Redis cannot check the login rate limit', async () => {
    const { guard, context } = createGuard(new Error('Redis offline'));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
