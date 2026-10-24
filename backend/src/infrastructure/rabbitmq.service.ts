import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';

export interface ReservationCreatedEvent {
  eventId: string;
  type: 'reserva.creada';
  reservationId: string;
  customerId: string;
  packageId: string;
  travelerCount: number;
  totalAmount: string;
  createdAt: string;
}

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private readonly reservationQueue = 'reserva.creada';

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
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertQueue(this.reservationQueue, { durable: true });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async publishReservationCreated(
    event: ReservationCreatedEvent,
  ): Promise<void> {
    const channel = this.channel;
    if (!channel) {
      throw new Error('RabbitMQ publisher channel is not available');
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('RabbitMQ publish confirmation timed out'));
      }, 5000);
      channel.sendToQueue(
        this.reservationQueue,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: event.eventId,
          correlationId: event.eventId,
          type: event.type,
        },
        (error) => {
          clearTimeout(timeout);
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
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
