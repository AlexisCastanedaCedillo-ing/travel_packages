import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Package } from '../database/entities/package.entity';
import {
  PaymentStatus,
  Reservation,
} from '../database/entities/reservation.entity';
import { User, UserRole } from '../database/entities/user.entity';
import type { PackageCacheService } from '../packages/package-cache.service';
import type { RabbitMqService } from '../infrastructure/rabbitmq.service';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  const actor: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'customer@example.test',
    role: UserRole.CUSTOMER,
  };

  function createService(availableSlots: number) {
    const pkg: Package = {
      id: '00000000-0000-4000-8000-000000000002',
      destination: 'Test destination',
      startDate: '2027-01-01',
      endDate: '2027-01-08',
      price: '12.34',
      totalCapacity: 10,
      availableSlots,
      createdAt: new Date(),
      updatedAt: new Date(),
      reservations: [],
    };
    const packageRepository = {
      findOne: jest.fn().mockResolvedValue(pkg),
      save: jest.fn().mockImplementation(async (value: Package) => value),
    };
    const userRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: actor.sub,
        role: UserRole.CUSTOMER,
      }),
    };
    const reservationRepository = {
      create: jest
        .fn()
        .mockImplementation((value: Partial<Reservation>) => value),
      save: jest
        .fn()
        .mockImplementation(async (value: Partial<Reservation>) => ({
          ...value,
          id: '00000000-0000-4000-8000-000000000003',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === User) {
          return userRepository;
        }
        if (entity === Package) {
          return packageRepository;
        }
        return reservationRepository;
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        async <T>(
          operation: (transactionManager: EntityManager) => Promise<T>,
        ) => operation(manager),
      ),
    } as unknown as DataSource;
    const cache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    const rabbitMq = {
      publishReservationCreated: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ReservationsService(
      {} as Repository<Reservation>,
      dataSource,
      cache as unknown as PackageCacheService,
      rabbitMq as unknown as RabbitMqService,
    );

    return {
      service,
      packageRepository,
      reservationRepository,
      cache,
      rabbitMq,
    };
  }

  it('locks availability, calculates exact amounts, and publishes after creation', async () => {
    const {
      service,
      packageRepository,
      reservationRepository,
      cache,
      rabbitMq,
    } = createService(5);

    const reservation = await service.create(
      {
        packageId: '00000000-0000-4000-8000-000000000002',
        travelerCount: 2,
      },
      actor,
    );

    expect(packageRepository.findOne).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000002' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(packageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ availableSlots: 3 }),
    );
    expect(reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        unitPrice: '12.34',
        totalAmount: '24.68',
        paymentStatus: PaymentStatus.PENDING,
      }),
    );
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
    expect(rabbitMq.publishReservationCreated).toHaveBeenCalledTimes(1);
    expect(reservation.paymentStatus).toBe(PaymentStatus.PENDING);
  });

  it('rejects insufficient availability without changing inventory or publishing', async () => {
    const { service, packageRepository, rabbitMq } = createService(1);

    await expect(
      service.create(
        {
          packageId: '00000000-0000-4000-8000-000000000002',
          travelerCount: 2,
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(packageRepository.save).not.toHaveBeenCalled();
    expect(rabbitMq.publishReservationCreated).not.toHaveBeenCalled();
  });
});
