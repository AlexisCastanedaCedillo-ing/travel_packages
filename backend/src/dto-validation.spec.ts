import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './auth/dto/login.dto';
import { CreatePackageDto } from './packages/dto/create-package.dto';
import { ListPackagesDto } from './packages/dto/list-packages.dto';
import { UpdatePackageDto } from './packages/dto/update-package.dto';
import { ListReservationsDto } from './reservations/dto/list-reservations.dto';
import { UpdateReservationStatusDto } from './reservations/dto/update-reservation-status.dto';
import { PaymentStatus } from './database/entities/reservation.entity';

describe('API DTO validation', () => {
  it('accepts package creation data and transforms a numeric price to a string', async () => {
    const dto = plainToInstance(CreatePackageDto, {
      destination: 'Cancun',
      startDate: '2027-05-10',
      endDate: '2027-05-17',
      price: 899,
      totalCapacity: 10,
    });

    expect(dto.price).toBe('899');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid package creation fields', async () => {
    const dto = plainToInstance(CreatePackageDto, {
      destination: ' ',
      startDate: 'not-a-date',
      endDate: '2027-05-17',
      price: '-2',
      totalCapacity: 0,
    });

    const errors = await validate(dto);
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining([
        'destination',
        'startDate',
        'price',
        'totalCapacity',
      ]),
    );
  });

  it('accepts a partial package update and rejects blank optional destinations', async () => {
    const validDto = plainToInstance(UpdatePackageDto, { price: '125.50' });
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const invalidDto = plainToInstance(UpdatePackageDto, { destination: '  ' });
    const errors = await validate(invalidDto);
    expect(errors.map(({ property }) => property)).toContain('destination');
  });

  it('transforms package search pagination and rejects invalid filters', async () => {
    const validDto = plainToInstance(ListPackagesDto, {
      page: '2',
      pageSize: '25',
      maxPrice: 999,
    });
    expect(validDto).toMatchObject({ page: 2, pageSize: 25, maxPrice: '999' });
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const invalidDto = plainToInstance(ListPackagesDto, {
      page: '0',
      pageSize: '101',
      maxPrice: '-1',
    });
    expect(await validate(invalidDto)).toHaveLength(3);
  });

  it('validates reservation list filters and page bounds', async () => {
    const validDto = plainToInstance(ListReservationsDto, {
      paymentStatus: PaymentStatus.PENDING,
      page: '1',
      pageSize: '20',
    });
    await expect(validate(validDto)).resolves.toHaveLength(0);

    const invalidDto = plainToInstance(ListReservationsDto, {
      paymentStatus: 'UNKNOWN',
      page: '0',
      pageSize: '101',
    });
    expect(await validate(invalidDto)).toHaveLength(3);
  });

  it('accepts valid login and reservation status values and rejects invalid values', async () => {
    const login = plainToInstance(LoginDto, {
      email: 'customer@example.test',
      password: 'password',
    });
    await expect(validate(login)).resolves.toHaveLength(0);

    const invalidLogin = plainToInstance(LoginDto, {
      email: 'invalid-email',
      password: '',
    });
    expect(await validate(invalidLogin)).toHaveLength(2);

    const validStatus = plainToInstance(UpdateReservationStatusDto, {
      paymentStatus: PaymentStatus.CANCELLED,
    });
    await expect(validate(validStatus)).resolves.toHaveLength(0);

    const invalidStatus = plainToInstance(UpdateReservationStatusDto, {
      paymentStatus: 'UNKNOWN',
    });
    expect(await validate(invalidStatus)).toHaveLength(1);
  });
});
