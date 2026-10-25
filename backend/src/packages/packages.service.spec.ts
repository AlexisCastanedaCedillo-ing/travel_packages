import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { Package } from '../database/entities/package.entity';
import type { PackageCacheService } from './package-cache.service';
import { PackagesService } from './packages.service';

describe('PackagesService', () => {
  const packageId = '00000000-0000-4000-8000-000000000001';
  const basePackage: Package = {
    id: packageId,
    destination: 'Cancun',
    startDate: '2027-05-10',
    endDate: '2027-05-17',
    price: '899.00',
    totalCapacity: 10,
    availableSlots: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    reservations: [],
  };

  function createService() {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn<() => Promise<[Package[], number]>>()
        .mockResolvedValue([[basePackage], 1]),
    };
    const packageRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOneBy: jest
        .fn<(criteria: { id: string }) => Promise<Package | null>>()
        .mockResolvedValue(basePackage),
      create: jest
        .fn<(value: Partial<Package>) => Package>()
        .mockImplementation((value) => Object.assign({}, basePackage, value)),
      save: jest
        .fn<(value: Package) => Promise<Package>>()
        .mockImplementation(async (value) => value),
      remove: jest
        .fn<(value: Package) => Promise<Package>>()
        .mockImplementation(async (value) => value),
    };
    const transactionPackageRepository = {
      findOne: jest
        .fn<
          (options: {
            where: { id: string };
            lock: { mode: 'pessimistic_write' };
          }) => Promise<Package | null>
        >()
        .mockResolvedValue(Object.assign({}, basePackage)),
      save: jest
        .fn<(value: Package) => Promise<Package>>()
        .mockImplementation(async (value) => value),
      remove: jest
        .fn<(value: Package) => Promise<Package>>()
        .mockImplementation(async (value) => value),
    };
    const reservationRepository = {
      countBy: jest
        .fn<(criteria: { packageId: string }) => Promise<number>>()
        .mockResolvedValue(0),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Package
          ? transactionPackageRepository
          : reservationRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(
        async <T>(operation: (manager: EntityManager) => Promise<T>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    const cache = {
      getVersion: jest
        .fn<PackageCacheService['getVersion']>()
        .mockResolvedValue('0'),
      get: jest.fn<PackageCacheService['get']>().mockResolvedValue(undefined),
      set: jest.fn<PackageCacheService['set']>().mockResolvedValue(undefined),
      invalidate: jest
        .fn<PackageCacheService['invalidate']>()
        .mockResolvedValue(undefined),
    };
    const service = new PackagesService(
      dataSource,
      packageRepository as unknown as Repository<Package>,
      cache as unknown as PackageCacheService,
    );

    return {
      service,
      packageRepository,
      transactionPackageRepository,
      reservationRepository,
      queryBuilder,
      cache,
      manager,
    };
  }

  it('rejects a date range whose end precedes its start', async () => {
    const { service, cache } = createService();

    await expect(
      service.list({
        startDate: '2027-05-20',
        endDate: '2027-05-10',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cache.getVersion).not.toHaveBeenCalled();
  });

  it('returns a cached result without querying the repository', async () => {
    const { service, packageRepository, cache } = createService();
    const cached = { data: [basePackage], total: 1, page: 1, pageSize: 20 };
    cache.get.mockResolvedValue(cached);

    await expect(service.list({ page: 1, pageSize: 20 })).resolves.toEqual(
      cached,
    );
    expect(packageRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('applies filters and pagination, then caches package search results', async () => {
    const { service, queryBuilder, cache } = createService();

    await expect(
      service.list({
        destination: ' Cancun ',
        startDate: '2027-05-01',
        endDate: '2027-05-30',
        maxPrice: '1000',
        page: 2,
        pageSize: 5,
      }),
    ).resolves.toEqual({
      data: [basePackage],
      total: 1,
      page: 2,
      pageSize: 5,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(4);
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(cache.set).toHaveBeenCalled();
  });

  it('returns an existing package and reports a missing one', async () => {
    const { service, packageRepository } = createService();
    await expect(service.findOne(packageId)).resolves.toEqual(basePackage);

    packageRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(packageId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a package with normalized destination and full availability', async () => {
    const { service, packageRepository, cache } = createService();

    const created = await service.create({
      destination: '  Cancun  ',
      startDate: '2027-05-10',
      endDate: '2027-05-17',
      price: '899.00',
      totalCapacity: 12,
    });

    expect(packageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Cancun',
        totalCapacity: 12,
        availableSlots: 12,
      }),
    );
    expect(created.destination).toBe('Cancun');
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('rejects creation with an invalid date range', async () => {
    const { service, packageRepository } = createService();

    await expect(
      service.create({
        destination: 'Cancun',
        startDate: '2027-05-20',
        endDate: '2027-05-10',
        price: '899.00',
        totalCapacity: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(packageRepository.save).not.toHaveBeenCalled();
  });

  it('updates package fields and preserves already booked places', async () => {
    const { service, transactionPackageRepository, cache } = createService();

    const updated = await service.update(packageId, {
      destination: '  Riviera Maya ',
      price: '999.00',
      totalCapacity: 12,
    });

    expect(transactionPackageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Riviera Maya',
        price: '999.00',
        totalCapacity: 12,
        availableSlots: 9,
      }),
    );
    expect(updated.availableSlots).toBe(9);
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('rejects reducing capacity below the number of booked places', async () => {
    const { service, cache } = createService();

    await expect(
      service.update(packageId, { totalCapacity: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('rejects an invalid date range when updating a package', async () => {
    const { service, transactionPackageRepository, cache } = createService();

    await expect(
      service.update(packageId, { endDate: '2027-05-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionPackageRepository.save).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('reports a missing package during update', async () => {
    const { service, transactionPackageRepository } = createService();
    transactionPackageRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update(packageId, { price: '999.00' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not delete a package that has reservations', async () => {
    const { service, reservationRepository, cache } = createService();
    reservationRepository.countBy.mockResolvedValue(1);

    await expect(service.remove(packageId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('deletes an unused package and invalidates the list cache', async () => {
    const { service, transactionPackageRepository, cache } = createService();

    await expect(service.remove(packageId)).resolves.toBeUndefined();

    expect(transactionPackageRepository.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: packageId }),
    );
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });
});
