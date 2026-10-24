import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const decimalAmountPattern = /^\d{1,10}(\.\d{1,2})?$/;

export class CreatePackageDto {
  @ApiProperty({ example: 'Cancun, Mexico', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  destination: string;

  @ApiProperty({ example: '2027-05-01', format: 'date' })
  @IsDateString({ strict: true })
  startDate: string;

  @ApiProperty({ example: '2027-05-08', format: 'date' })
  @IsDateString({ strict: true })
  endDate: string;

  @ApiProperty({ example: '899.00', pattern: '^\\d{1,10}(\\.\\d{1,2})?$' })
  @Transform(({ value }: { value: unknown }) => String(value))
  @IsString()
  @Matches(decimalAmountPattern)
  price: string;

  @ApiProperty({ example: 25, minimum: 1 })
  @IsInt()
  @Min(1)
  totalCapacity: number;
}
