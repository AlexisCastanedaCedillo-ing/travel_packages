import { config } from 'dotenv';
import { connect, type ConfirmChannel } from 'amqplib';
import { DataSource } from 'typeorm';
import dataSource from '../database/data-source';
import { processMessage } from './notification-processor';

const reservationQueue = 'reserva.creada';
const retryQueue = 'reservation.created.retry';
const deadLetterQueue = 'reservation.created.dead';

config({ path: '.env' });
config({ path: '../.env' });

async function startWorker(): Promise<void> {
  await dataSource.initialize();
  const source: DataSource = dataSource;
  const connection = await connect(createRabbitMqUrl());
  const channel: ConfirmChannel = await connection.createConfirmChannel();
  await channel.assertQueue(reservationQueue, { durable: true });
  await channel.assertQueue(retryQueue, {
    durable: true,
    arguments: {
      'x-message-ttl': 3000,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': reservationQueue,
    },
  });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  await channel.prefetch(1);
  await channel.consume(
    reservationQueue,
    (message) => {
      if (message) {
        void processMessage(message, channel, source).catch(
          (error: unknown) => {
            console.error('Unhandled notification worker failure:', error);
          },
        );
      }
    },
    { noAck: false },
  );
  console.info(`Notification worker is consuming ${reservationQueue}.`);

  const close = async (): Promise<void> => {
    await channel.close();
    await connection.close();
    if (source.isInitialized) {
      await source.destroy();
    }
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
}

function createRabbitMqUrl(): string {
  const url = new URL('amqp://localhost');
  url.hostname = process.env.RABBITMQ_HOST ?? 'localhost';
  url.port = process.env.RABBITMQ_PORT ?? '5672';
  url.username = process.env.RABBITMQ_USER ?? '';
  url.password = process.env.RABBITMQ_PASSWORD ?? '';
  return url.toString();
}

void startWorker().catch(async (error: unknown) => {
  console.error('Notification worker failed to start:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exitCode = 1;
});
