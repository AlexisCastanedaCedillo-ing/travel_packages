import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ErrorReason } from '../common/error-reason';
import {
  PaymentStatus,
  Reservation,
} from '../database/entities/reservation.entity';
import { Package } from '../database/entities/package.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { PackageCacheService } from '../packages/package-cache.service';
import { RabbitMqService } from '../infrastructure/rabbitmq.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';

export interface ReservationListResult {
  data: Reservation[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
    private readonly dataSource: DataSource,
    private readonly cache: PackageCacheService,
    private readonly rabbitMq: RabbitMqService,
  ) {}

  async create(
    dto: CreateReservationDto,
    actor: AuthenticatedUser,
  ): Promise<Reservation> {
    if (
      actor.role === UserRole.CUSTOMER &&
      dto.customerId &&
      dto.customerId !== actor.sub
    ) {
      throw new ForbiddenException(ErrorReason.CustomerOnlyReserveSelf);
    }

    const customerId =
      actor.role === UserRole.CUSTOMER ? actor.sub : dto.customerId;
    if (!customerId) {
      throw new BadRequestException(ErrorReason.AdminAgentMustProvideCustomerId);
    }

    const reservation = await this.dataSource.transaction(
      async (manager): Promise<Reservation> => {
        const customer = await manager.getRepository(User).findOneBy({
          id: customerId,
        });
        if (!customer) {
          throw new NotFoundException(ErrorReason.CustomerNotFound);
        }
        if (customer.role !== UserRole.CUSTOMER) {
          throw new BadRequestException(
            ErrorReason.ReservationsOnlyForCustomers,
          );
        }

        const pkg = await manager.getRepository(Package).findOne({
          where: { id: dto.packageId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!pkg) {
          throw new NotFoundException(ErrorReason.PackageNotFound);
        }
        if (pkg.availableSlots < dto.travelerCount) {
          throw new ConflictException(ErrorReason.NotEnoughAvailableSlots);
        }

        const unitPriceCents = this.amountToCents(pkg.price);
        const totalAmountCents = unitPriceCents * BigInt(dto.travelerCount);
        if (totalAmountCents > 99_999_999_999_999n) {
          throw new BadRequestException(ErrorReason.ReservationTotalExceedsLimit);
        }

        pkg.availableSlots -= dto.travelerCount;
        await manager.getRepository(Package).save(pkg);
        return manager.getRepository(Reservation).save(
          manager.getRepository(Reservation).create({
            customerId,
            createdById: actor.sub,
            packageId: pkg.id,
            travelerCount: dto.travelerCount,
            unitPrice: this.centsToAmount(unitPriceCents),
            totalAmount: this.centsToAmount(totalAmountCents),
            paymentStatus: PaymentStatus.PENDING,
          }),
        );
      },
    );

    await this.cache.invalidate();
    try {
      await this.rabbitMq.publishReservationCreated({
        eventId: reservation.id,
        type: 'reserva.creada',
        reservationId: reservation.id,
        customerId: reservation.customerId,
        packageId: reservation.packageId,
        travelerCount: reservation.travelerCount,
        totalAmount: reservation.totalAmount,
        createdAt: reservation.createdAt.toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Reservation committed but event publication failed for ${reservation.id}: ${this.errorMessage(error)}`,
      );
    }
    return reservation;
  }

  async list(
    query: ListReservationsDto,
    actor: AuthenticatedUser,
  ): Promise<ReservationListResult> {
    const builder = this.reservations
      .createQueryBuilder('reservation')
      .where('1 = 1');
    if (actor.role === UserRole.CUSTOMER) {
      builder.where('reservation.customerId = :customerId', {
        customerId: actor.sub,
      });
    }
    if (query.paymentStatus) {
      builder.andWhere('reservation.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }
    const [data, total] = await builder
      .orderBy('reservation.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<Reservation> {
    const reservation = await this.reservations.findOneBy({ id });
    if (!reservation) {
      throw new NotFoundException(ErrorReason.ReservationNotFound);
    }
    this.assertCanAccess(reservation, actor);
    return reservation;
  }

  async updateStatus(
    id: string,
    dto: UpdateReservationStatusDto,
    actor: AuthenticatedUser,
  ): Promise<Reservation> {
    const result = await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.getRepository(Reservation).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) {
        throw new NotFoundException(ErrorReason.ReservationNotFound);
      }
      this.assertCanAccess(reservation, actor);

      if (
        actor.role === UserRole.CUSTOMER &&
        dto.paymentStatus !== PaymentStatus.CANCELLED
      ) {
        throw new ForbiddenException(
          ErrorReason.CustomersMayOnlyCancelReservations,
        );
      }
      if (
        dto.paymentStatus === PaymentStatus.PAID &&
        reservation.paymentStatus !== PaymentStatus.PENDING
      ) {
        throw new ConflictException(
          ErrorReason.OnlyPendingReservationsCanBePaid,
        );
      }
      if (
        dto.paymentStatus === PaymentStatus.PENDING &&
        reservation.paymentStatus !== PaymentStatus.PENDING
      ) {
        throw new ConflictException(
          ErrorReason.ReservationPaymentStatusCannotResetToPending,
        );
      }
      if (
        reservation.paymentStatus === PaymentStatus.CANCELLED &&
        dto.paymentStatus !== PaymentStatus.CANCELLED
      ) {
        throw new ConflictException(
          ErrorReason.CancelledReservationsCannotBeReopened,
        );
      }
      if (reservation.paymentStatus === dto.paymentStatus) {
        return { reservation, inventoryChanged: false };
      }

      let inventoryChanged = false;
      if (dto.paymentStatus === PaymentStatus.CANCELLED) {
        const pkg = await manager.getRepository(Package).findOne({
          where: { id: reservation.packageId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!pkg) {
          throw new NotFoundException(
            ErrorReason.PackageAssociatedReservationNotFound,
          );
        }
        const restoredSlots = pkg.availableSlots + reservation.travelerCount;
        if (restoredSlots > pkg.totalCapacity) {
          throw new ConflictException(
            ErrorReason.CancellationWouldExceedPackageCapacity,
          );
        }
        pkg.availableSlots = restoredSlots;
        await manager.getRepository(Package).save(pkg);
        inventoryChanged = true;
      }

      reservation.paymentStatus = dto.paymentStatus;
      const updated = await manager
        .getRepository(Reservation)
        .save(reservation);
      return { reservation: updated, inventoryChanged };
    });
    if (result.inventoryChanged) {
      await this.cache.invalidate();
    }
    return result.reservation;
  }

  private assertCanAccess(
    reservation: Reservation,
    actor: AuthenticatedUser,
  ): void {
    if (
      actor.role === UserRole.CUSTOMER &&
      reservation.customerId !== actor.sub
    ) {
      throw new ForbiddenException(
        ErrorReason.YouCannotAccessAnotherCustomerReservation,
      );
    }
  }

  private amountToCents(amount: string): bigint {
    const [whole, fraction = ''] = amount.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  }

  private centsToAmount(cents: bigint): string {
    return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
