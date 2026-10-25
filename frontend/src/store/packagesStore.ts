import { create } from 'zustand';
import { deletePackage, getPackageById, listPackages } from '../lib/packages';
import type { PackageItem } from '../types/package';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'No se pudo cargar la información de los paquetes.';
}

type PackagesState = {
  packages: PackageItem[];
  selectedPackage: PackageItem | null;
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
  fetchPackages: (params?: Record<string, string | number | undefined>) => Promise<void>;
  fetchPackageById: (id: string) => Promise<void>;
  deletePackageById: (id: string) => Promise<void>;
  clearSelectedPackage: () => void;
};

export const usePackagesStore = create<PackagesState>((set) => ({
  packages: [],
  selectedPackage: null,
  isLoading: false,
  isDetailLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 5,
  fetchPackages: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const result = await listPackages({
        page: 1,
        pageSize: 5,
        ...params,
      });

      set({
        packages: result.data,
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
  fetchPackageById: async (id: string) => {
    set({ isDetailLoading: true, error: null });

    try {
      const packageItem = await getPackageById(id);
      set({ selectedPackage: packageItem, isDetailLoading: false });
    } catch (error) {
      set({
        selectedPackage: null,
        error: getErrorMessage(error),
        isDetailLoading: false,
      });
      throw error;
    }
  },
  deletePackageById: async (id: string) => {
    set({ error: null });

    try {
      await deletePackage(id);
      set((state) => ({
        packages: state.packages.filter((pkg) => pkg.id !== id),
        total: Math.max(0, state.total - 1),
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },
  clearSelectedPackage: () => set({ selectedPackage: null, error: null }),
}));
