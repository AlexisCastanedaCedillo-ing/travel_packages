import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { usePackagesStore } from '../../store/packagesStore';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
});

const defaultFilters = {
  destination: '',
  startDate: '',
  endDate: '',
  maxPrice: '',
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6V4h8v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14H6L5 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function PackagesPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const { packages, isLoading, error, total, page, pageSize, fetchPackages, deletePackageById } =
    usePackagesStore();
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() => {
    if (
      location.state &&
      typeof location.state === 'object' &&
      'successMessage' in location.state
    ) {
      return String(location.state.successMessage);
    }

    return null;
  });
  const [itemsPerPage, setItemsPerPage] = useState<number>(pageSize);

  const hasActiveFilters = useMemo(
    () =>
      Object.values(filters).some(
        (value) => typeof value === 'string' && value.trim() !== '',
      ),
    [filters],
  );

  const totalPages = useMemo(() => {
    if (!total || !itemsPerPage) {
      return 1;
    }

    return Math.ceil(total / itemsPerPage);
  }, [itemsPerPage, total]);

  useEffect(() => {
    void fetchPackages({
      ...appliedFilters,
      page,
      pageSize: itemsPerPage,
    });
  }, [appliedFilters, fetchPackages, itemsPerPage, page]);

  function updateFilter(field: keyof typeof defaultFilters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters() {
    const nextFilters = {
      destination: filters.destination.trim(),
      startDate: filters.startDate,
      endDate: filters.endDate,
      maxPrice: filters.maxPrice.trim(),
    };

    if (nextFilters.startDate && nextFilters.endDate && nextFilters.endDate < nextFilters.startDate) {
      setFilterError('La fecha fin no puede ser menor que la fecha de inicio.');
      return;
    }

    if (nextFilters.maxPrice && Number(nextFilters.maxPrice) < 0) {
      setFilterError('El precio máximo no puede ser negativo.');
      return;
    }

    setFilterError(null);
    setAppliedFilters(nextFilters);
    void fetchPackages({
      ...nextFilters,
      page: 1,
      pageSize: itemsPerPage,
    });
  }

  function resetFilters() {
    setFilterError(null);
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    void fetchPackages({
      page: 1,
      pageSize: itemsPerPage,
    });
  }

  function handlePageSizeChange(value: string) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return;
    }

    setItemsPerPage(parsedValue);
    void fetchPackages({
      ...appliedFilters,
      page: 1,
      pageSize: parsedValue,
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Deseas eliminar este paquete?')) {
      return;
    }

    try {
      await deletePackageById(id);
      setSuccessMessage('Paquete eliminado correctamente.');
      if (page > 1 && packages.length === 1) {
        void fetchPackages({
          ...appliedFilters,
          page: page - 1,
          pageSize: itemsPerPage,
        });
      }
    } catch {
      // Error already surfaced in the store state.
    }
  }

  return (
    <div className="page-header">
      <p className="eyebrow">Paquetes</p>
      <h1>Listado de paquetes</h1>

      {successMessage ? (
        <div role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="toolbar-row">
        <p className="page-description">
          {total > 0 ? `Mostrando ${packages.length} de ${total} paquetes.` : 'Consulta de paquetes disponibles.'}
        </p>

        {user?.role === 'admin' ? (
          <Link to="/packages/new" className="primary-button link-button">
            + Crear paquete
          </Link>
        ) : null}
      </div>

      <div className="filters-card">
        <div className="filter-grid">
          <label>
            <span>Destino</span>
            <input
              type="text"
              value={filters.destination}
              onChange={(event) => updateFilter('destination', event.target.value)}
              placeholder="Cancún, Cusco..."
            />
          </label>

          <label>
            <span>Fecha inicio</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => updateFilter('startDate', event.target.value)}
            />
          </label>

          <label>
            <span>Fecha fin</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => updateFilter('endDate', event.target.value)}
            />
          </label>

          <label>
            <span>Precio máximo</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={filters.maxPrice}
              onChange={(event) => updateFilter('maxPrice', event.target.value)}
              placeholder="1000"
            />
          </label>
        </div>

        <div className="filter-actions">
          <button type="button" className="primary-button small-button" onClick={applyFilters}>
            Aplicar filtros
          </button>
          <button
            type="button"
            className="secondary-button disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            Limpiar
          </button>
        </div>
      </div>

      {filterError ? <p className="error-message" role="alert">{filterError}</p> : null}

      {isLoading ? (
        <div className="page-state compact-state">
          <h1 role="status" aria-live="polite">Cargando paquetes...</h1>
        </div>
      ) : null}

      {!isLoading && error ? <p className="error-message" role="alert">{error}</p> : null}

      {!isLoading && !error && packages.length === 0 ? (
        <div className="page-state compact-state">
          <h1>No hay paquetes disponibles</h1>
          <p className="page-description">
            Intenta ajustar los filtros o vuelve más tarde.
          </p>
        </div>
      ) : null}

      {!isLoading && packages.length > 0 ? (
        <div className="package-grid">
          {packages.map((pkg) => (
            <article key={pkg.id} className="package-card">
              <div className="package-card-header">
                <span className="package-badge">Disponibles: {pkg.availableSlots}</span>
              </div>

              <h2>{pkg.destination}</h2>

              <div className="package-meta">
                <span>Desde</span>
                <strong>{pkg.startDate}</strong>
              </div>

              <div className="package-meta">
                <span>Hasta</span>
                <strong>{pkg.endDate}</strong>
              </div>

              <div className="package-meta">
                <span>Precio</span>
                <strong>{currencyFormatter.format(Number(pkg.price ?? 0))}</strong>
              </div>

              <div className="package-meta">
                <span>Cupo total</span>
                <strong>{pkg.totalCapacity}</strong>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Link
                  to={`/packages/${pkg.id}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
                  title="Ver detalle"
                  aria-label="Ver detalle"
                >
                  <EyeIcon />
                </Link>

                {user?.role === 'admin' ? (
                  <>
                    <Link
                      to={`/packages/${pkg.id}/edit`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-fuchsia-200 hover:text-fuchsia-700"
                      title="Editar paquete"
                      aria-label="Editar paquete"
                    >
                      <PencilIcon />
                    </Link>

                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-red-200 hover:text-red-600"
                      title="Eliminar paquete"
                      aria-label="Eliminar paquete"
                      onClick={() => void handleDelete(pkg.id)}
                    >
                      <TrashIcon />
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && total > 0 ? (
        <div className="pagination">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span>Elementos</span>
              <select
                value={itemsPerPage}
                onChange={(event) => handlePageSizeChange(event.target.value)}
                className="min-w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none ring-0"
              >
                {[5, 10, 15, 20, 25].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className="secondary-button"
              onClick={() => fetchPackages({ ...appliedFilters, page: Math.max(1, page - 1), pageSize: itemsPerPage })}
              disabled={page <= 1}
            >
              Anterior
            </button>

            <span>
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={() => fetchPackages({ ...appliedFilters, page: Math.min(totalPages, page + 1), pageSize: itemsPerPage })}
              disabled={page >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
