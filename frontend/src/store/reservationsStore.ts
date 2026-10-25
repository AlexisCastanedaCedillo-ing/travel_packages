import { create } from 'zustand';
import {
  createReservation,
  listReservations,
  updateReservationStatus,
} from '../lib/reservations';
import type { ReservationItem } from '../types/reservation';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'No se pudo cargar la información de las reservas.';
}

type ReservationsState = {
  reservations: ReservationItem[];
  selectedReservation: ReservationItem | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  fetchReservations: (
    params?: Record<string, string | number | undefined>,
  ) => Promise<void>;
  createReservationForCurrentUser: (payload: {
    packageId: string;
    travelerCount: number;
    customerId?: string;
  }) => Promise<ReservationItem>;
  updateReservationPaymentStatus: (
    id: string,
    paymentStatus: ReservationItem['paymentStatus'],
  ) => Promise<ReservationItem>;
  clearSelectedReservation: () => void;
};

export const useReservationsStore = create<ReservationsState>((set) => ({
  reservations: [],
  selectedReservation: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 10,
  fetchReservations: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const result = await listReservations({
        page: 1,
        pageSize: 10,
        ...params,
      });

      set({
        reservations: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },
  createReservationForCurrentUser: async (payload) => {
    set({ error: null });

    try {
      const reservation = await createReservation(payload);
      set((state) => ({
        reservations: [reservation, ...state.reservations],
        total: state.total + 1,
      }));
      return reservation;
    } catch (error) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },
  updateReservationPaymentStatus: async (id, paymentStatus) => {
    set({ error: null });

    try {
      const reservation = await updateReservationStatus(id, paymentStatus);
      set((state) => ({
        reservations: state.reservations.map((current) =>
          current.id === id ? { ...current, paymentStatus: reservation.paymentStatus } : current,
        ),
      }));
      return reservation;
    } catch (error) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },
  clearSelectedReservation: () => set({ selectedReservation: null, error: null }),
}));
