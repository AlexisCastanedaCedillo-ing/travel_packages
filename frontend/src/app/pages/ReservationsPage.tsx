import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getReservationById } from '../../lib/reservations';
import { useAuthStore } from '../../store/authStore';
import { useReservationsStore } from '../../store/reservationsStore';
import type { PaymentStatus, ReservationItem } from '../../types/reservation';

const paymentStatusOptions = ['ALL', 'PENDING', 'PAID', 'CANCELLED'] as const;
type PaymentStatusFilter = (typeof paymentStatusOptions)[number];

const paymentStatusLabels: Record<PaymentStatusFilter, string> = {
  ALL: 'Todos',
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
};

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
});

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ReservationsPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    reservations,
    isLoading,
    error,
    total,
    page,
    pageSize,
    fetchReservations,
    updateReservationPaymentStatus,
  } = useReservationsStore();

  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('ALL');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<ReservationItem | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingReservationId, setUpdatingReservationId] = useState<string | null>(null);

  useEffect(() => {
    void fetchReservations({
      paymentStatus: paymentStatusFilter === 'ALL' ? undefined : paymentStatusFilter,
      page: 1,
      pageSize,
    });
  }, [fetchReservations, pageSize, paymentStatusFilter]);

  useEffect(() => {
    const stateMessage =
      location.state &&
      typeof location.state === 'object' &&
      'successMessage' in location.state
        ? String(location.state.successMessage)
        : null;

    if (stateMessage) {
      setSuccessMessage(stateMessage);
    }
  }, [location.state]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  async function handleStatusChange(id: string, nextStatus: PaymentStatus) {
    const label = paymentStatusLabels[nextStatus];
    if (!window.confirm(`¿Deseas cambiar el estado de la reserva "${id.slice(0, 8)}" a "${label}"?`)) {
      return;
    }

    setUpdatingReservationId(id);
    try {
      await updateReservationPaymentStatus(id, nextStatus);
      setSuccessMessage('Estado de la reserva actualizado correctamente.');
      void fetchReservations({
        paymentStatus: paymentStatusFilter === 'ALL' ? undefined : paymentStatusFilter,
        page,
        pageSize,
      });
    } catch {
      // Error is surfaced in the store state.
    } finally {
      setUpdatingReservationId(null);
    }
  }

  async function handleViewReservation(id: string) {
    setDetailError(null);
    setDetailLoading(true);
    setSelectedReservation(null);

    try {
      const reservation = await getReservationById(id);
      setSelectedReservation(reservation);
    } catch (error) {
      setDetailError(
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'No se pudo cargar el detalle de la reserva.',
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function handlePageChange(nextPage: number) {
    void fetchReservations({
      paymentStatus: paymentStatusFilter === 'ALL' ? undefined : paymentStatusFilter,
      page: nextPage,
      pageSize,
    });
  }

  return (
    <div className="page-header">
      <p className="eyebrow">Reservas</p>
      <h1>Gestión de reservaciones</h1>

      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="toolbar-row">
        <p className="page-description">
          {total > 0 ? `Mostrando ${reservations.length} de ${total} reservas.` : 'Consulta de reservas del sistema.'}
        </p>
        <Link to="/reservations/new" className="primary-button link-button">
          + Crear reserva
        </Link>
      </div>

      <div className="filters-card" style={{ marginBottom: '20px' }}>
        <div className="filter-grid">
          <label>
            <span>Estado</span>
            <select
              value={paymentStatusFilter}
              onChange={(event) => setPaymentStatusFilter(event.target.value as PaymentStatusFilter)}
            >
              {paymentStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {paymentStatusLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      {isLoading ? (
        <div className="page-state compact-state">
          <h1>Cargando reservas...</h1>
        </div>
      ) : null}

      {!isLoading && !error && reservations.length === 0 ? (
        <div className="page-state compact-state">
          <h1>No hay reservas disponibles</h1>
          <p className="page-description">No se encontraron resultados con los filtros actuales.</p>
        </div>
      ) : null}

      {!isLoading && reservations.length > 0 ? (
        <div className="package-grid" style={{ gridTemplateColumns: '1fr' }}>
          {reservations.map((reservation) => (
            <article key={reservation.id} className="package-card">
              <div className="package-card-header">
                <span className="package-badge">
                  {paymentStatusLabels[reservation.paymentStatus as PaymentStatusFilter] ?? reservation.paymentStatus}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="package-meta">
                  <span>ID</span>
                  <strong>{reservation.id.slice(0, 8)}...</strong>
                </div>
                <div className="package-meta">
                  <span>Paquete</span>
                  <strong>{reservation.destination}</strong>
                </div>
                <div className="package-meta">
                  <span>Cliente</span>
                  <strong>{reservation.customerEmail}</strong>
                </div>
                <div className="package-meta">
                  <span>Viajeros</span>
                  <strong>{reservation.travelerCount}</strong>
                </div>
                <div className="package-meta">
                  <span>Total</span>
                  <strong>{currencyFormatter.format(Number(reservation.totalAmount ?? 0))}</strong>
                </div>
                <div className="package-meta">
                  <span>Creada</span>
                  <strong>{reservation.createdAt ? new Date(reservation.createdAt).toLocaleDateString('es-ES') : '—'}</strong>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
                  title="Ver detalle"
                  aria-label="Ver detalle"
                  onClick={() => void handleViewReservation(reservation.id)}
                >
                  <EyeIcon />
                </button>

                {reservation.paymentStatus !== 'CANCELLED' ? (
                  <>
                    {user?.role !== 'customer' && reservation.paymentStatus === 'PENDING' ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleStatusChange(reservation.id, 'PAID')}
                        disabled={updatingReservationId === reservation.id}
                      >
                        {updatingReservationId === reservation.id ? 'Actualizando...' : 'Marcar pagada'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void handleStatusChange(reservation.id, 'CANCELLED')}
                      disabled={updatingReservationId === reservation.id}
                    >
                      {updatingReservationId === reservation.id ? 'Actualizando...' : 'Cancelar reserva'}
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
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value || 10);
                  void fetchReservations({
                    paymentStatus: paymentStatusFilter === 'ALL' ? undefined : paymentStatusFilter,
                    page: 1,
                    pageSize: nextSize,
                  });
                }}
                className="min-w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none"
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
              onClick={() => handlePageChange(Math.max(1, page - 1))}
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
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      {selectedReservation || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Detalle de reserva</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedReservation(null)}
              >
                Cerrar
              </button>
            </div>

            {detailLoading ? (
              <div className="py-10 text-center text-slate-600">Cargando detalle...</div>
            ) : null}

            {detailError ? <p className="error-message">{detailError}</p> : null}

            {selectedReservation ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destino</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {selectedReservation.destination}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo del cliente</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {selectedReservation.customerEmail}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {selectedReservation.customer?.id ?? selectedReservation.customerId}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paquete</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {selectedReservation.packageId ?? selectedReservation.package?.destination}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Viajeros</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{selectedReservation.travelerCount}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monto total</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {currencyFormatter.format(Number(selectedReservation.totalAmount ?? 0))}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {paymentStatusLabels[selectedReservation.paymentStatus as PaymentStatusFilter] ?? selectedReservation.paymentStatus}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creada</p>
                  <p className="mt-2 text-base font-medium text-slate-900">
                    {selectedReservation.createdAt
                      ? new Date(selectedReservation.createdAt).toLocaleString('es-ES')
                      : 'No disponible'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
