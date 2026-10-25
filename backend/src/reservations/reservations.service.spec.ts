import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
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
  const customerActor: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'customer@example.test',
    role: UserRole.CUSTOMER,
  };
  const agentActor: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000004',
    email: 'agent@example.test',
    role: UserRole.AGENT,
  };
  const packageId = '00000000-0000-4000-8000-000000000002';
  const reservationId = '00000000-0000-4000-8000-000000000003';

  function createService(
    options: {
      availableSlots?: number;
      packageExists?: boolean;
      customerExists?: boolean;
      customerRole?: UserRole;
      reservationExists?: boolean;
      reservationStatus?: PaymentStatus;
      reservationCustomerId?: string;
      packagePrice?: string;
    } = {},
  ) {
    const pkg: Package = {
      id: packageId,
      destination: 'Test destination',
      startDate: '2027-01-01',
      endDate: '2027-01-08',
      price: options.packagePrice ?? '12.34',
      totalCapacity: 10,
      availableSlots: options.availableSlots ?? 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      reservations: [],
    };
    const customer = {
      id: customerActor.sub,
      email: customerActor.email,
      role: options.customerRole ?? UserRole.CUSTOMER,
    } as User;
    const reservation = {
      id: reservationId,
      travelerCount: 2,
      unitPrice: '12.34',
      totalAmount: '24.68',
      paymentStatus: options.reservationStatus ?? PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId: options.reservationCustomerId ?? customerActor.sub,
      createdById: agentActor.sub,
      packageId,
      customer,
      package: pkg,
      createdBy: agentActor,
    } as Reservation;
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn<() => Promise<[Reservation[], number]>>()
        .mockResolvedValue([[reservation], 1]),
    };
    const packageRepository = {
      findOne: jest
        .fn()
        .mockImplementation(async () =>
          options.packageExists === false ? null : pkg,
        ),
      save: jest
        .fn<(value: Package) => Promise<Package>>()
        .mockImplementation(async (value) => value),
    };
    const userRepository = {
      findOneBy: jest
        .fn()
        .mockImplementation(async () =>
          options.customerExists === false ? null : customer,
        ),
    };
    const reservationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest
        .fn()
        .mockImplementation(async () =>
          options.reservationExists === false ? null : reservation,
        ),
      create: jest
        .fn<(value: Partial<Reservation>) => Partial<Reservation>>()
        .mockImplementation((value) => value),
      save: jest
        .fn<(value: Partial<Reservation>) => Promise<Partial<Reservation>>>()
        .mockImplementation(async (value) => ({
          ...value,
          id: reservationId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === User) return userRepository;
        if (entity === Package) return packageRepository;
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
    const cache = {
      invalidate: jest
        .fn<PackageCacheService['invalidate']>()
        .mockResolvedValue(undefined),
    };
    const rabbitMq = {
      publishReservationCreated: jest
        .fn<RabbitMqService['publishReservationCreated']>()
        .mockResolvedValue(undefined),
    };
    const service = new ReservationsService(
      reservationRepository as unknown as Repository<Reservation>,
      dataSource,
      cache as unknown as PackageCacheService,
      rabbitMq as unknown as RabbitMqService,
    );

    return {
      service,
      pkg,
      reservation,
      packageRepository,
      userRepository,
      reservationRepository,
      queryBuilder,
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
    } = createService({ availableSlots: 5 });

    const result = await service.create(
      { packageId, travelerCount: 2 },
      customerActor,
    );

    expect(packageRepository.findOne).toHaveBeenCalledWith({
      where: { id: packageId },
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
    expect(result.paymentStatus).toBe(PaymentStatus.PENDING);
  });

  it('rejects insufficient availability without changing inventory or publishing', async () => {
    const { service, packageRepository, rabbitMq } = createService({
      availableSlots: 1,
    });

    await expect(
      service.create({ packageId, travelerCount: 2 }, customerActor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(packageRepository.save).not.toHaveBeenCalled();
    expect(rabbitMq.publishReservationCreated).not.toHaveBeenCalled();
  });

  it('does not allow a customer to create a reservation for someone else', async () => {
    const { service, userRepository } = createService();

    await expect(
      service.create(
        {
          packageId,
          travelerCount: 1,
          customerId: '00000000-0000-4000-8000-000000000099',
        },
        customerActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('requires agents and admins to specify a customer', async () => {
    const { service } = createService();

    await expect(
      service.create({ packageId, travelerCount: 1 }, agentActor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing customer, a non-customer account, and a missing package', async () => {
    const missingCustomer = createService({ customerExists: false });
    await expect(
      missingCustomer.service.create(
        { packageId, travelerCount: 1 },
        customerActor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const wrongRole = createService({ customerRole: UserRole.AGENT });
    await expect(
      wrongRole.service.create({ packageId, travelerCount: 1 }, customerActor),
    ).rejects.toBeInstanceOf(BadRequestException);

    const missingPackage = createService({ packageExists: false });
    await expect(
      missingPackage.service.create(
        { packageId, travelerCount: 1 },
        customerActor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects reservation totals that exceed the supported amount', async () => {
    const { service, packageRepository, rabbitMq } = createService({
      availableSlots: 2,
      packagePrice: '999999999999.99',
    });

    await expect(
      service.create({ packageId, travelerCount: 2 }, customerActor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(packageRepository.save).not.toHaveBeenCalled();
    expect(rabbitMq.publishReservationCreated).not.toHaveBeenCalled();
  });

  it('keeps a committed reservation when event publication fails', async () => {
    const { service, rabbitMq, cache } = createService();
    rabbitMq.publishReservationCreated.mockRejectedValue(
      new Error('broker unavailable'),
    );

    await expect(
      service.create({ packageId, travelerCount: 1 }, customerActor),
    ).resolves.toMatchObject({ paymentStatus: PaymentStatus.PENDING });
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('lists only the current customer reservations and maps display fields', async () => {
    const { service, queryBuilder } = createService();

    const result = await service.list(
      { page: 2, pageSize: 5, paymentStatus: PaymentStatus.PENDING },
      customerActor,
    );

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'reservation.customerId = :customerId',
      { customerId: customerActor.sub },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'reservation.paymentStatus = :paymentStatus',
      { paymentStatus: PaymentStatus.PENDING },
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(result.data[0]).toMatchObject({
      destination: 'Test destination',
      customerEmail: customerActor.email,
    });
  });

  it('does not add customer ownership filtering to agent reservation lists', async () => {
    const { service, queryBuilder } = createService();

    await service.list({ page: 1, pageSize: 10 }, agentActor);

    expect(queryBuilder.where).toHaveBeenCalledWith('1 = 1');
    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('returns a reservation detail and rejects missing or foreign reservations', async () => {
    const ownReservation = createService();
    await expect(
      ownReservation.service.findOne(reservationId, customerActor),
    ).resolves.toMatchObject({
      destination: 'Test destination',
      customerEmail: customerActor.email,
    });

    const missing = createService({ reservationExists: false });
    await expect(
      missing.service.findOne(reservationId, customerActor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const foreign = createService({
      reservationCustomerId: '00000000-0000-4000-8000-000000000099',
    });
    await expect(
      foreign.service.findOne(reservationId, customerActor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an agent to mark a pending reservation as paid', async () => {
    const { service, reservationRepository, cache } = createService();

    const updated = await service.updateStatus(
      reservationId,
      { paymentStatus: PaymentStatus.PAID },
      agentActor,
    );

    expect(updated.paymentStatus).toBe(PaymentStatus.PAID);
    expect(reservationRepository.save).toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('allows a customer to cancel their own reservation and restore package capacity', async () => {
    const { service, pkg, packageRepository, cache } = createService({
      availableSlots: 5,
    });

    const updated = await service.updateStatus(
      reservationId,
      { paymentStatus: PaymentStatus.CANCELLED },
      customerActor,
    );

    expect(updated.paymentStatus).toBe(PaymentStatus.CANCELLED);
    expect(pkg.availableSlots).toBe(7);
    expect(packageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ availableSlots: 7 }),
    );
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('rejects customers attempting to mark a reservation as paid', async () => {
    const { service } = createService();

    await expect(
      service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.PAID },
        customerActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid status transitions and leaves an unchanged status alone', async () => {
    const unchangedReservation = createService();
    await expect(
      unchangedReservation.service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.PENDING },
        agentActor,
      ),
    ).resolves.toMatchObject({ paymentStatus: PaymentStatus.PENDING });
    expect(
      unchangedReservation.reservationRepository.save,
    ).not.toHaveBeenCalled();

    const paidReservation = createService({
      reservationStatus: PaymentStatus.PAID,
    });
    await expect(
      paidReservation.service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.PENDING },
        agentActor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const cancelledReservation = createService({
      reservationStatus: PaymentStatus.CANCELLED,
    });
    await expect(
      cancelledReservation.service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.PAID },
        agentActor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects cancellation when the related package is missing or capacity would overflow', async () => {
    const missingPackage = createService({ packageExists: false });
    await expect(
      missingPackage.service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.CANCELLED },
        customerActor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    const fullPackage = createService({ availableSlots: 9 });
    await expect(
      fullPackage.service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.CANCELLED },
        customerActor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found when updating a reservation that does not exist', async () => {
    const { service } = createService({ reservationExists: false });

    await expect(
      service.updateStatus(
        reservationId,
        { paymentStatus: PaymentStatus.PAID },
        agentActor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
