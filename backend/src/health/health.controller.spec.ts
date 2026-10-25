import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DataSource } from 'typeorm';
import type { RedisService } from '../infrastructure/redis.service';
import type { RabbitMqService } from '../infrastructure/rabbitmq.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  function createController() {
    const dataSource = {
      query: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue([{ '?column?': 1 }]),
    };
    const redis = {
      client: {
        ping: jest.fn<() => Promise<string>>().mockResolvedValue('PONG'),
      },
    };
    const rabbitMq = {
      isAvailable: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    };
    const controller = new HealthController(
      dataSource as unknown as DataSource,
      redis as unknown as RedisService,
      rabbitMq as unknown as RabbitMqService,
    );
    return { controller, dataSource, redis, rabbitMq };
  }

  it('reports healthy status when PostgreSQL, Redis, and RabbitMQ respond', async () => {
    const { controller, dataSource, redis, rabbitMq } = createController();

    await expect(controller.getHealth()).resolves.toEqual({
      postgres: { status: 'ok' },
      redis: { status: 'ok' },
      rabbitmq: { status: 'ok' },
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(redis.client.ping).toHaveBeenCalled();
    expect(rabbitMq.isAvailable).toHaveBeenCalled();
  });

  it('reports dependency errors and returns service unavailable if a dependency fails', async () => {
    const { controller, dataSource } = createController();
    dataSource.query.mockRejectedValue(new Error('database unavailable'));

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    try {
      await controller.getHealth();
    } catch (error) {
      expect(
        (error as ServiceUnavailableException).getResponse(),
      ).toMatchObject({
        postgres: {
          status: 'error',
          error: 'database unavailable',
        },
      });
    }
  });

  it('marks RabbitMQ unavailable as unhealthy', async () => {
    const { controller, rabbitMq } = createController();
    rabbitMq.isAvailable.mockResolvedValue(false);

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
