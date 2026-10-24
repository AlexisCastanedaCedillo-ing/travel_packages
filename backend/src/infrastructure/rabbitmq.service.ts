import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type ChannelModel } from 'amqplib';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: ChannelModel;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = new URL('amqp://localhost');
    url.hostname = this.config.getOrThrow<string>('RABBITMQ_HOST');
    url.port = String(this.config.getOrThrow<number>('RABBITMQ_PORT'));
    url.username = this.config.getOrThrow<string>('RABBITMQ_USER');
    url.password = this.config.getOrThrow<string>('RABBITMQ_PASSWORD');
    this.connection = await connect(url.toString());
    this.connection.on('error', (error: Error) => {
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close();
  }
}
