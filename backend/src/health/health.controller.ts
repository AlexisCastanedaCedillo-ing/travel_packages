import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../infrastructure/redis.service';
import { RabbitMqService } from '../infrastructure/rabbitmq.service';

interface DependencyHealth {
  status: 'ok' | 'error';
  error?: string;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  @Get()
  async getHealth(): Promise<Record<string, DependencyHealth>> {
    const [postgres, redis, rabbitmq] = await Promise.all([
      this.checkDependency(() => this.dataSource.query('SELECT 1')),
      this.checkDependency(() => this.redis.client.ping()),
      this.checkDependency(async () => {
        if (!(await this.rabbitMq.isAvailable())) {
          throw new Error('RabbitMQ publisher is not connected');
        }
      }),
    ]);
    const health = { postgres, redis, rabbitmq };
    if (
      Object.values(health).some((dependency) => dependency.status === 'error')
    ) {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }

  private async checkDependency(
    check: () => Promise<unknown>,
  ): Promise<DependencyHealth> {
    try {
      await check();
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
