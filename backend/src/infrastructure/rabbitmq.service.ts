import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';


@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = new URL('amqp://localhost');
    url.hostname = this.config.getOrThrow<string>('RABBITMQ_HOST');
    url.port = String(this.config.getOrThrow<number>('RABBITMQ_PORT'));
    url.username = this.config.getOrThrow<string>('RABBITMQ_USER');
    url.password = this.config.getOrThrow<string>('RABBITMQ_PASSWORD');
    this.connection = await connect(url.toString());
    this.connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
    });
    this.connection.on('error', (error: Error) => {
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }


  async isAvailable(): Promise<boolean> {
    if (!this.connection || !this.channel) {
      return false;
    }

    const channel = await this.connection.createChannel();
    await channel.close();
    return true;
  }
}
