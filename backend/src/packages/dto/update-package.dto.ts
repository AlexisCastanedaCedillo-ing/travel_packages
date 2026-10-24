import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const decimalAmountPattern = /^\d{1,10}(\.\d{1,2})?$/;

export class UpdatePackageDto {
  @ApiPropertyOptional({ example: 'Cancun, Mexico', maxLength: 255 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  destination?: string;

  @ApiPropertyOptional({ example: '2027-05-01', format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-05-08', format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;

  @ApiPropertyOptional({
    example: '949.00',
    pattern: '^\\d{1,10}(\\.\\d{1,2})?$',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => String(value))
  @IsString()
  @Matches(decimalAmountPattern)
  price?: string;

  @ApiPropertyOptional({ example: 30, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCapacity?: number;
}
