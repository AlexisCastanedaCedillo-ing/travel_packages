export type UserRole = 'admin' | 'agent' | 'customer';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
};

export type ApiError = {
  message: string;
  status?: number;
  code?: string;
};
