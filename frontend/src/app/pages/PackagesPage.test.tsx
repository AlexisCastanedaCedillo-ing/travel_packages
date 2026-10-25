import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PackagesPage } from './PackagesPage';

const { mockUsePackagesStore, mockUseAuthStore } = vi.hoisted(() => ({
  mockUsePackagesStore: vi.fn(),
  mockUseAuthStore: vi.fn(),
}));

vi.mock('../../store/packagesStore', () => ({
  usePackagesStore: mockUsePackagesStore,
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: mockUseAuthStore,
}));

const packageItem = {
  id: 'package-1',
  destination: 'Cancún, México',
  startDate: '2027-05-10',
  endDate: '2027-05-17',
  price: '899.50',
  totalCapacity: 12,
  availableSlots: 8,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PackagesPage />
    </MemoryRouter>,
  );
}

describe('PackagesPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({ user: { role: 'customer' } });
    mockUsePackagesStore.mockReturnValue({
      packages: [packageItem],
      isLoading: false,
      error: null,
      total: 1,
      page: 1,
      pageSize: 5,
      fetchPackages: vi.fn().mockResolvedValue(undefined),
      deletePackageById: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders package data returned by the store', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Listado de paquetes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cancún, México' })).toBeInTheDocument();
    expect(screen.getByText(/Disponibles:\s*8/)).toBeInTheDocument();
    expect(screen.getByText(/899,50/)).toBeInTheDocument();
  });

  it('shows an accessible error when package loading fails', () => {
    mockUsePackagesStore.mockReturnValue({
      packages: [packageItem],
      isLoading: false,
      error: 'No se pudo cargar la información de los paquetes.',
      total: 0,
      page: 1,
      pageSize: 5,
      fetchPackages: vi.fn().mockResolvedValue(undefined),
      deletePackageById: vi.fn().mockResolvedValue(undefined),
    });

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo cargar la información de los paquetes.',
    );
    expect(screen.queryByText('Cancún, México')).not.toBeInTheDocument();
  });
});
