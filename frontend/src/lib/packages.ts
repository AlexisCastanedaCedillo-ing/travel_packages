import type { PackageItem, PackageListResponse } from '../types/package';
import api from './api';

export type PackageFormPayload = {
  destination: string;
  startDate: string;
  endDate: string;
  price: string;
  totalCapacity: number;
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

export async function listPackages(
  params: Record<string, string | number | undefined> = {},
): Promise<PackageListResponse> {
  const sanitizedParams = sanitizeQueryParams(params);
  const { data } = await api.get<PackageListResponse>('/packages', {
    params: sanitizedParams,
  });
  return data;
}

export async function getPackageById(id: string): Promise<PackageItem> {
  const { data } = await api.get<PackageItem>(`/packages/${id}`);
  return data;
}

export async function createPackage(payload: PackageFormPayload): Promise<PackageItem> {
  const { data } = await api.post<PackageItem>('/packages', payload);
  return data;
}

export async function updatePackage(
  id: string,
  payload: Partial<PackageFormPayload>,
): Promise<PackageItem> {
  const { data } = await api.patch<PackageItem>(`/packages/${id}`, payload);
  return data;
}

export async function deletePackage(id: string): Promise<void> {
  await api.delete(`/packages/${id}`);
}
