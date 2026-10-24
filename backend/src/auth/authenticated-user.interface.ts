import { UserRole } from '../database/entities/user.entity';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
}
