import { type ConfirmChannel, type ConsumeMessage } from 'amqplib';
import type { DataSource } from 'typeorm';
import type { ReservationCreatedEvent } from '../infrastructure/rabbitmq.service';

const retryQueue = 'reservation.created.retry';
const deadLetterQueue = 'reservation.created.dead';
const maxAttempts = 3;

export async function processMessage(
  message: ConsumeMessage,
  channel: ConfirmChannel,
  source: DataSource,
): Promise<void> {
  try {
    const event = parseEvent(message);
    await source.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO "processed_notifications"
          ("event_id", "reservation_id", "message", "processed_at")
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT DO NOTHING`,
        [
          event.eventId,
          event.reservationId,
          `Reservation ${event.reservationId} created for ${event.travelerCount} traveler(s).`,
        ],
      );
    });
    channel.ack(message);
  } catch (error) {
    const attempt = Number(message.properties.headers?.['x-retry-count'] ?? 0);
    console.error(
      `Failed to process reservation event (attempt ${attempt + 1}):`,
      error,
    );
    if (attempt + 1 < maxAttempts) {
      try {
        await publishConfirmed(channel, retryQueue, message.content, {
          ...message.properties,
          headers: {
            ...message.properties.headers,
            'x-retry-count': attempt + 1,
          },
        });
        channel.ack(message);
      } catch (publishError) {
        console.error('Failed to enqueue notification retry:', publishError);
        channel.nack(message, false, true);
      }
    } else {
      try {
        await publishConfirmed(channel, deadLetterQueue, message.content, {
          ...message.properties,
          headers: {
            ...message.properties.headers,
            'x-final-error':
              error instanceof Error ? error.message : String(error),
          },
        });
        channel.ack(message);
      } catch (publishError) {
        console.error('Failed to dead-letter notification:', publishError);
        channel.nack(message, false, true);
      }
    }
  }
}

function parseEvent(message: ConsumeMessage): ReservationCreatedEvent {
  const value: unknown = JSON.parse(message.content.toString());
  if (!isReservationCreatedEvent(value)) {
    throw new Error('Reservation event has an invalid payload');
  }
  return value;
}

function isReservationCreatedEvent(
  value: unknown,
): value is ReservationCreatedEvent {
  if (
    !value ||
    typeof value !== 'object' ||
    !('eventId' in value) ||
    !('reservationId' in value) ||
    !('type' in value) ||
    !('customerId' in value) ||
    !('packageId' in value) ||
    !('travelerCount' in value) ||
    !('totalAmount' in value) ||
    !('createdAt' in value)
  ) {
    return false;
  }

  const event = value as Record<string, unknown>;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    event.type !== 'reserva.creada' ||
    typeof event.eventId !== 'string' ||
    !uuidPattern.test(event.eventId) ||
    event.eventId !== event.reservationId ||
    typeof event.reservationId !== 'string' ||
    typeof event.customerId !== 'string' ||
    typeof event.packageId !== 'string' ||
    typeof event.travelerCount !== 'number' ||
    !Number.isInteger(event.travelerCount) ||
    event.travelerCount < 1 ||
    typeof event.totalAmount !== 'string' ||
    typeof event.createdAt !== 'string'
  ) {
    return false;
  }
  return true;
}

async function publishConfirmed(
  channel: ConfirmChannel,
  queue: string,
  content: Buffer,
  properties: ConsumeMessage['properties'],
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    channel.sendToQueue(
      queue,
      content,
      { ...properties, persistent: true },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      },
    );
  });
}
