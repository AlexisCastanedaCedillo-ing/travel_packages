import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Reservation } from './reservation.entity';

@Entity({ name: 'packages' })
@Check(`"price" >= 0`)
@Check(`"total_capacity" > 0`)
@Check(`"available_slots" >= 0`)
@Check(`"available_slots" <= "total_capacity"`)
@Check(`"end_date" >= "start_date"`)
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  destination: string;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: false })
  price: string;

  @Column({ name: 'total_capacity', type: 'int', nullable: false })
  totalCapacity: number;

  @Column({ name: 'available_slots', type: 'int', nullable: false })
  availableSlots: number;

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

  @OneToMany(() => Reservation, (reservation) => reservation.package)
  reservations: Relation<Reservation[]>;
}
