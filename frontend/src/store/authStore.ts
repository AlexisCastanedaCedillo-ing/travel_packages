import { create } from 'zustand';
import { decodeJwtPayload, loginUser } from '../lib/auth';
import type { AuthUser, LoginRequest } from '../types/auth';

const STORAGE_KEY = 'travel_lili_auth';

type AuthSession = {
  token: string;
  user: AuthUser;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

function persistSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('travel_lili_access_token', session.token);
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('travel_lili_access_token');
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  login: async (credentials) => {
    const response = await loginUser(credentials);
    const user = decodeJwtPayload(response.accessToken);

    if (!user) {
      throw new Error('El token recibido no contiene la información del usuario.');
    }

    const session: AuthSession = {
      token: response.accessToken,
      user,
    };

    set({
      token: session.token,
      user: session.user,
      isAuthenticated: true,
    });

    persistSession(session);
  },
  logout: () => {
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });

    persistSession(null);
  },
  hydrate: () => {
    const rawSession = localStorage.getItem(STORAGE_KEY);

    if (!rawSession) {
      set({ isHydrated: true, token: null, user: null, isAuthenticated: false });
      return;
    }

    try {
      const parsed = JSON.parse(rawSession) as AuthSession;

      if (!parsed?.token || !parsed?.user) {
        persistSession(null);
        set({ isHydrated: true, token: null, user: null, isAuthenticated: false });
        return;
      }

      set({
        token: parsed.token,
        user: parsed.user,
        isAuthenticated: true,
        isHydrated: true,
      });
    } catch {
      persistSession(null);
      set({ isHydrated: true, token: null, user: null, isAuthenticated: false });
    }
  },
}));
