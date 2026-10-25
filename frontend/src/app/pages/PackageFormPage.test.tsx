import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PackageFormPage } from './PackageFormPage';

const { mockCreatePackage } = vi.hoisted(() => ({
  mockCreatePackage: vi.fn(),
}));

vi.mock('../../lib/packages', () => ({
  createPackage: mockCreatePackage,
  getPackageById: vi.fn(),
  updatePackage: vi.fn(),
}));

describe('PackageFormPage', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows validation errors when submitting an empty package form', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PackageFormPage mode="create" />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Crear paquete' }));

    expect(await screen.findByText('El destino es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La fecha de inicio es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('La fecha de fin es obligatoria.')).toBeInTheDocument();
    await waitFor(() => expect(mockCreatePackage).not.toHaveBeenCalled());
  });
});
