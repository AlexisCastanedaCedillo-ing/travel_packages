import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Reservation } from './reservation.entity';

@Entity({ name: 'processed_notifications' })
export class ProcessedNotification {
  @PrimaryColumn({ type: 'uuid', name: 'event_id' })
  eventId: string;

  @Column({ name: 'reservation_id', type: 'uuid', unique: true, nullable: false })
  reservationId: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: false })
  processedAt: Date;

  @OneToOne(() => Reservation, (reservation) => reservation.processedNotification, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;
}
