import type { ReservationItem, ReservationListResponse } from '../types/reservation';
import api from './api';

export type ReservationFormPayload = {
  packageId: string;
  travelerCount: number;
  customerId?: string;
};

export type ReservationStatusPayload = {
  paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED';
};

function sanitizeQueryParams(
  params: Record<string, string | number | undefined>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === 'string') {
        return value.trim() !== '';
      }

      return true;
    }),
  ) as Record<string, string | number>;
}

export async function listReservations(
  params: Record<string, string | number | undefined> = {},
): Promise<ReservationListResponse> {
  const { data } = await api.get<ReservationListResponse>('/reservaciones', {
    params: sanitizeQueryParams(params),
  });
  return data;
}

export async function getReservationById(id: string): Promise<ReservationItem> {
  const { data } = await api.get<ReservationItem>(`/reservaciones/${id}`);
  return data;
}

export async function createReservation(
  payload: ReservationFormPayload,
): Promise<ReservationItem> {
  const { data } = await api.post<ReservationItem>('/reservaciones', payload);
  return data;
}

export async function updateReservationStatus(
  id: string,
  paymentStatus: ReservationStatusPayload['paymentStatus'],
): Promise<ReservationItem> {
  const { data } = await api.patch<ReservationItem>(`/reservaciones/${id}/estado`, {
    paymentStatus,
  });
  return data;
}
