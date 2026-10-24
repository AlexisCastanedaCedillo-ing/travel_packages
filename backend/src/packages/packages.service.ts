import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { ListPackagesDto } from './dto/list-packages.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackageCacheService } from './package-cache.service';

export interface PackageListResult {
  data: Package[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class PackagesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Package)
    private readonly packages: Repository<Package>,
    private readonly cache: PackageCacheService,
  ) {}

  async list(query: ListPackagesDto): Promise<PackageListResult> {
    if (query.startDate && query.endDate && query.endDate < query.startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
    const queryKey = JSON.stringify({
      destination: query.destination?.trim().toLowerCase() ?? null,
      startDate: query.startDate ?? null,
      endDate: query.endDate ?? null,
      maxPrice: query.maxPrice ?? null,
      page: query.page,
      pageSize: query.pageSize,
    });
    const cacheVersion = await this.cache.getVersion();
    const cached = await this.cache.get<PackageListResult>(
      queryKey,
      cacheVersion,
    );
    if (cached) {
      return cached;
    }

    const builder = this.packages.createQueryBuilder('package').where('1 = 1');
    if (query.destination) {
      builder.andWhere('LOWER(package.destination) LIKE :destination', {
        destination: `%${query.destination.trim().toLowerCase()}%`,
      });
    }
    if (query.startDate) {
      builder.andWhere('package.endDate >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      builder.andWhere('package.startDate <= :endDate', {
        endDate: query.endDate,
      });
    }
    if (query.maxPrice) {
      builder.andWhere('package.price <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }
    const [data, total] = await builder
      .orderBy('package.startDate', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    const result = { data, total, page: query.page, pageSize: query.pageSize };
    await this.cache.set(queryKey, cacheVersion, result);
    return result;
  }

  async findOne(id: string): Promise<Package> {
    const result = await this.packages.findOneBy({ id });
    if (!result) {
      throw new NotFoundException('Package not found');
    }
    return result;
  }

  async create(dto: CreatePackageDto): Promise<Package> {
    this.validateDateRange(dto.startDate, dto.endDate);
    const result = await this.packages.save(
      this.packages.create({
        destination: dto.destination.trim(),
        startDate: dto.startDate,
        endDate: dto.endDate,
        price: dto.price,
        totalCapacity: dto.totalCapacity,
        availableSlots: dto.totalCapacity,
      }),
    );
    await this.cache.invalidate();
    return result;
  }

  async update(id: string, dto: UpdatePackageDto): Promise<Package> {
    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Package);
      const pkg = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pkg) {
        throw new NotFoundException('Package not found');
      }
      const startDate = dto.startDate ?? pkg.startDate;
      const endDate = dto.endDate ?? pkg.endDate;
      this.validateDateRange(startDate, endDate);

      if (dto.destination !== undefined) {
        pkg.destination = dto.destination.trim();
      }
      if (dto.startDate !== undefined) {
        pkg.startDate = dto.startDate;
      }
      if (dto.endDate !== undefined) {
        pkg.endDate = dto.endDate;
      }
      if (dto.price !== undefined) {
        pkg.price = dto.price;
      }
      if (dto.totalCapacity !== undefined) {
        const bookedSlots = pkg.totalCapacity - pkg.availableSlots;
        if (dto.totalCapacity < bookedSlots) {
          throw new ConflictException(
            'Total capacity cannot be lower than already reserved places',
          );
        }
        pkg.totalCapacity = dto.totalCapacity;
        pkg.availableSlots = dto.totalCapacity - bookedSlots;
      }
      return repository.save(pkg);
    });
    await this.cache.invalidate();
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const pkg = await manager.getRepository(Package).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pkg) {
        throw new NotFoundException('Package not found');
      }
      const reservationCount = await manager
        .getRepository(Reservation)
        .countBy({ packageId: id });
      if (reservationCount > 0) {
        throw new ConflictException(
          'A package with reservations cannot be deleted',
        );
      }
      await manager.getRepository(Package).remove(pkg);
    });
    await this.cache.invalidate();
  }

  private validateDateRange(startDate: string, endDate: string): void {
    if (endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }
  }
}
