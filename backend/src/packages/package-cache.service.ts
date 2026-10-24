import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../infrastructure/redis.service';

@Injectable()
export class PackageCacheService {
  private readonly logger = new Logger(PackageCacheService.name);
  private readonly versionKey = 'packages:list:version';
  private readonly ttlSeconds = 60;

  constructor(private readonly redis: RedisService) {}

  async getVersion(): Promise<string> {
    try {
      return (await this.redis.client.get(this.versionKey)) ?? '0';
    } catch (error) {
      this.logger.warn(
        `Package cache version read failed: ${this.errorMessage(error)}`,
      );
      return '0';
    }
  }

  async get<T>(queryKey: string, version: string): Promise<T | undefined> {
    try {
      const cached = await this.redis.client.get(
        `packages:list:${version}:${queryKey}`,
      );
      return cached === null ? undefined : (JSON.parse(cached) as T);
    } catch (error) {
      this.logger.warn(
        `Package cache read failed: ${this.errorMessage(error)}`,
      );
      return undefined;
    }
  }

  async set<T>(queryKey: string, version: string, value: T): Promise<void> {
    try {
      await this.redis.client.set(
        `packages:list:${version}:${queryKey}`,
        JSON.stringify(value),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      this.logger.warn(
        `Package cache write failed: ${this.errorMessage(error)}`,
      );
    }
  }

  async invalidate(): Promise<void> {
    try {
      await this.redis.client.incr(this.versionKey);
    } catch (error) {
      this.logger.error(
        `Package cache invalidation failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
