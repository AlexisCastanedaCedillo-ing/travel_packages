import { Module } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import { RedisService } from './redis.service';

@Module({
  providers: [RabbitMqService, RedisService],
  exports: [RabbitMqService, RedisService],
})
export class InfrastructureModule {}
