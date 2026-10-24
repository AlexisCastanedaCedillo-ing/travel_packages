import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  packageId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  travelerCount: number;

  @ApiPropertyOptional({
    description: 'Required when the reservation is created by an agent',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
