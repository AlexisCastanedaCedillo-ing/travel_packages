import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Package } from './package.entity';
import { User } from './user.entity';
import { ProcessedNotification } from './processed-notification.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'reservations' })
@Check(`"traveler_count" > 0`)
@Check(`"unit_price" >= 0`)
@Check(`"total_amount" >= 0`)
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'traveler_count', type: 'int', nullable: false })
  travelerCount: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
  })
  unitPrice: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: false,
  })
  totalAmount: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    nullable: false,
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    nullable: false,
  })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.reservationsAsCustomer, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Relation<User>;
  @Index('idx_reservations_customer_id')
  @Column({ name: 'customer_id', type: 'uuid', nullable: false })
  customerId: string;

  @ManyToOne(() => User, (user) => user.reservationsCreated, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<User>;
  @Index('idx_reservations_created_by_id')
  @Column({ name: 'created_by_id', type: 'uuid', nullable: false })
  createdById: string;

  @ManyToOne(() => Package, (pkg) => pkg.reservations, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'package_id' })
  package: Relation<Package>;
  @Index('idx_reservations_package_id')
  @Column({ name: 'package_id', type: 'uuid', nullable: false })
  packageId: string;

  @OneToOne(
    () => ProcessedNotification,
    (notification) => notification.reservation,
  )
  processedNotification: Relation<ProcessedNotification>;
}
