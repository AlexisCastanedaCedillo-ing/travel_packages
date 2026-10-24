import type { AuthUser, LoginRequest, LoginResponse } from '../types/auth';
import api from './api';

export async function loginUser(credentials: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', credentials);
  return data;
}

export function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split('.');

    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded) as {
      sub?: string;
      email?: string;
      role?: AuthUser['role'];
    };

    if (!parsed.email || !parsed.role) {
      return null;
    }

    return {
      id: parsed.sub ?? '',
      email: parsed.email,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}
