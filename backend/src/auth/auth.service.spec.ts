import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcrypt';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('returns a bearer token for valid normalized credentials', async () => {
    const passwordHash = await hash('CorrectPassword123!', 4);
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'customer@example.test',
      password: passwordHash,
      role: UserRole.CUSTOMER,
    } as User;
    const findOne = jest.fn().mockResolvedValue(user);
    const users = { findOne } as unknown as Repository<User>;
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    const service = new AuthService(users, jwt as unknown as JwtService);

    await expect(
      service.login({
        email: ' Customer@Example.Test ',
        password: 'CorrectPassword123!',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { email: 'customer@example.test' },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  });

  it('does not disclose whether an account exists for invalid credentials', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const users = { findOne } as unknown as Repository<User>;
    const jwt = { signAsync: jest.fn() };
    const service = new AuthService(users, jwt as unknown as JwtService);

    await expect(
      service.login({ email: 'missing@example.test', password: 'incorrect' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
