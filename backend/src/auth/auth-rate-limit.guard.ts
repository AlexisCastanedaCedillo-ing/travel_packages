import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { RedisService } from '../infrastructure/redis.service';

const windowSeconds = 60;
const maxLoginAttempts = 5;
const incrementWithExpiry = `
  local attempts = redis.call('INCR', KEYS[1])
  if attempts == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return attempts
`;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AuthRateLimitGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const address = request.ip || request.socket.remoteAddress || 'unknown';
    let attempts: number;
    try {
      attempts = Number(
        await this.redis.client.eval(
          incrementWithExpiry,
          1,
          `auth:login:${address}`,
          windowSeconds,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Login rate limit check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException('Login is temporarily unavailable');
    }

    if (attempts > maxLoginAttempts) {
      throw new HttpException(
        'Too many login attempts; try again in one minute',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
