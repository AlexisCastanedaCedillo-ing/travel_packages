import { jest } from '@jest/globals';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { DataSource } from 'typeorm';
import { processMessage } from './notification-processor';

describe('notification worker processor', () => {
  const reservationId = '00000000-0000-4000-8000-000000000003';
  const event = {
    eventId: reservationId,
    type: 'reserva.creada',
    reservationId,
    customerId: '00000000-0000-4000-8000-000000000001',
    packageId: '00000000-0000-4000-8000-000000000002',
    travelerCount: 2,
    totalAmount: '24.68',
    createdAt: '2027-01-01T00:00:00.000Z',
  };

  function createProcessorMocks(
    options: {
      headers?: Record<string, unknown>;
      transactionError?: Error;
      publishError?: Error;
      content?: Buffer;
    } = {},
  ) {
    const query = jest.fn<() => Promise<unknown>>().mockResolvedValue([]);
    const transaction = jest.fn(
      async (
        operation: (manager: { query: typeof query }) => Promise<unknown>,
      ) => {
        if (options.transactionError) {
          throw options.transactionError;
        }
        return operation({ query });
      },
    );
    const source = { transaction } as unknown as DataSource;
    const sendToQueue = jest.fn(
      (
        _queue: string,
        _content: Buffer,
        _properties: object,
        confirm: (error?: Error | null) => void,
      ) => {
        confirm(options.publishError ?? null);
        return true;
      },
    );
    const ack = jest.fn();
    const nack = jest.fn();
    const channel = {
      sendToQueue,
      ack,
      nack,
    } as unknown as ConfirmChannel;
    const message = {
      content: options.content ?? Buffer.from(JSON.stringify(event)),
      properties: { headers: options.headers ?? {} },
    } as ConsumeMessage;

    return {
      source,
      channel,
      message,
      query,
      transaction,
      sendToQueue,
      ack,
      nack,
    };
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists a valid event idempotently before acknowledging it', async () => {
    const { source, channel, message, query, ack, nack } =
      createProcessorMocks();

    await processMessage(message, channel, source);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT DO NOTHING'),
      [
        reservationId,
        reservationId,
        `Reservation ${reservationId} created for 2 traveler(s).`,
      ],
    );
    expect(ack).toHaveBeenCalledWith(message);
    expect(nack).not.toHaveBeenCalled();
  });

  it('sends a failed first processing attempt to the retry queue', async () => {
    const { source, channel, message, sendToQueue, ack } = createProcessorMocks(
      {
        transactionError: new Error('database unavailable'),
      },
    );

    await processMessage(message, channel, source);

    expect(sendToQueue).toHaveBeenCalledWith(
      'reservation.created.retry',
      message.content,
      expect.objectContaining({
        persistent: true,
        headers: { 'x-retry-count': 1 },
      }),
      expect.any(Function),
    );
    expect(ack).toHaveBeenCalledWith(message);
  });

  it('sends the final failed attempt to the dead-letter queue', async () => {
    const { source, channel, message, sendToQueue, ack } = createProcessorMocks(
      {
        headers: { 'x-retry-count': 2 },
        transactionError: new Error('database unavailable'),
      },
    );

    await processMessage(message, channel, source);

    expect(sendToQueue).toHaveBeenCalledWith(
      'reservation.created.dead',
      message.content,
      expect.objectContaining({
        persistent: true,
        headers: {
          'x-retry-count': 2,
          'x-final-error': 'database unavailable',
        },
      }),
      expect.any(Function),
    );
    expect(ack).toHaveBeenCalledWith(message);
  });

  it('requeues the original message when publishing a retry fails', async () => {
    const { source, channel, message, ack, nack } = createProcessorMocks({
      transactionError: new Error('database unavailable'),
      publishError: new Error('broker unavailable'),
    });

    await processMessage(message, channel, source);

    expect(nack).toHaveBeenCalledWith(message, false, true);
    expect(ack).not.toHaveBeenCalled();
  });

  it('requeues the original message when dead-letter publishing fails', async () => {
    const { source, channel, message, ack, nack } = createProcessorMocks({
      headers: { 'x-retry-count': 2 },
      transactionError: new Error('database unavailable'),
      publishError: new Error('broker unavailable'),
    });

    await processMessage(message, channel, source);

    expect(nack).toHaveBeenCalledWith(message, false, true);
    expect(ack).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON and schedules it for retry without touching the database', async () => {
    const { source, channel, message, query, sendToQueue, ack } =
      createProcessorMocks({
        content: Buffer.from('{invalid-json'),
      });

    await processMessage(message, channel, source);

    expect(query).not.toHaveBeenCalled();
    expect(sendToQueue).toHaveBeenCalledWith(
      'reservation.created.retry',
      message.content,
      expect.any(Object),
      expect.any(Function),
    );
    expect(ack).toHaveBeenCalledWith(message);
  });

  it.each([
    ['non-event JSON', { value: true }],
    ['unknown event type', { ...event, type: 'other' }],
    [
      'event and reservation IDs that differ',
      { ...event, reservationId: '00000000-0000-4000-8000-000000000009' },
    ],
    ['invalid traveler count', { ...event, travelerCount: 0 }],
    ['fractional traveler count', { ...event, travelerCount: 1.5 }],
    ['invalid event ID', { ...event, eventId: 'not-a-uuid' }],
  ])('retries %s without persisting a notification', async (_case, payload) => {
    const { source, channel, message, query, ack } = createProcessorMocks({
      content: Buffer.from(JSON.stringify(payload)),
    });

    await processMessage(message, channel, source);

    expect(query).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(message);
  });
});
