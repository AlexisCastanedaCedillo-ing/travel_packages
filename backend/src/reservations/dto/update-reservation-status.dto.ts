import { IsEnum } from 'class-validator';
import { PaymentStatus } from '../../database/entities/reservation.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}
