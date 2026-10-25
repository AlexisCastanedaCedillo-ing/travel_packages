import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listPackages } from '../../lib/packages';
import { useAuthStore } from '../../store/authStore';
import { useReservationsStore } from '../../store/reservationsStore';
import type { PackageItem } from '../../types/package';
import { amountToCents, currencyFormatter } from '../../utils/common-functions';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function ReservationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createReservationForCurrentUser } = useReservationsStore();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [packageId, setPackageId] = useState('');
  const [travelerCount, setTravelerCount] = useState(1);
  const [customerId, setCustomerId] = useState('');

  const isCustomer = user?.role === 'customer';
  const selectedPackage = packages.find((item) => item.id === packageId);
  const totalCents = useMemo(
    () =>
      selectedPackage
        ? amountToCents(selectedPackage.price) *
          BigInt(Number.isInteger(travelerCount) && travelerCount > 0 ? travelerCount : 0)
        : 0n,
    [selectedPackage, travelerCount],
  );

  useEffect(() => {
    let isMounted = true;

    void listPackages({ page: 1, pageSize: 100 })
      .then((result) => {
        if (isMounted) {
          setPackages(result.data);
          setPackagesLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setPackagesError(
            getErrorMessage(error, 'No se pudieron cargar los paquetes.'),
          );
          setPackagesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedPackage) {
      setSubmitError('Selecciona un paquete para continuar.');
      return;
    }

    if (!Number.isInteger(travelerCount) || travelerCount < 1) {
      setSubmitError('La cantidad de viajeros debe ser al menos 1.');
      return;
    }

    if (travelerCount > selectedPackage.availableSlots) {
      setSubmitError('La cantidad de viajeros supera los cupos disponibles.');
      return;
    }

    if (!isCustomer && !customerId.trim()) {
      setSubmitError('Debes indicar el ID del cliente para crear la reservación.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReservationForCurrentUser({
        packageId: selectedPackage.id,
        travelerCount,
        ...(!isCustomer ? { customerId: customerId.trim() } : {}),
      });
      navigate('/reservations', {
        replace: true,
        state: { successMessage: 'Reserva creada correctamente.' },
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error, 'No se pudo crear la reservación.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-header">
      <p className="eyebrow">Reservas</p>
      <h1>Crear reservación</h1>
      <p className="page-description">
        Selecciona el paquete y la cantidad de viajeros. El total mostrado es el cálculo por la cantidad de viajeros.
      </p>

      <form className="package-form mt-6" onSubmit={(event) => void handleSubmit(event)}>
        <div className="filter-grid">
          <label>
            <span>Paquete</span>
            <select
              id="reservation-package"
              value={packageId}
              onChange={(event) => setPackageId(event.target.value)}
              disabled={packagesLoading || packagesError !== null}
              aria-describedby={packagesError ? 'packages-load-error' : undefined}
              required
            >
              <option value="">Selecciona un paquete</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id} disabled={item.availableSlots < 1}>
                  {item.destination} · {item.startDate} ({item.availableSlots} cupos)
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Cantidad de viajeros</span>
            <input
              id="traveler-count"
              type="number"
              min="1"
              max={selectedPackage?.availableSlots}
              step="1"
              value={travelerCount}
              onChange={(event) => setTravelerCount(Number(event.target.value))}
              aria-describedby="reservation-traveler-help"
              required
            />
            <span id="reservation-traveler-help" className="field-hint">
              No más de {selectedPackage?.availableSlots ?? 0} cupos disponibles.
            </span>
          </label>

          {!isCustomer ? (
            <label>
              <span>ID del cliente</span>
              <input
                id="reservation-customer-id"
                type="text"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                placeholder="UUID del cliente"
                required
              />
            </label>
          ) : null}
        </div>

        {packagesLoading ? (
          <p className="page-description mt-4" role="status" aria-live="polite">
            Cargando paquetes...
          </p>
        ) : null}
        {packagesError ? (
          <p id="packages-load-error" className="error-message mt-4" role="alert">
            {packagesError}
          </p>
        ) : null}
        {!packagesLoading && !packagesError && packages.length === 0 ? (
          <p className="page-description mt-4" role="status">
            No hay paquetes disponibles para reservar.
          </p>
        ) : null}

        {selectedPackage ? (
          <section className="package-detail-card mt-6" aria-label="Resumen del paquete" aria-live="polite">
            <div className="detail-row">
              <span className="detail-label">Destino</span>
              <strong>{selectedPackage.destination}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Fechas</span>
              <strong>{selectedPackage.startDate} - {selectedPackage.endDate}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Precio por viajero</span>
              <strong>{currencyFormatter.format(Number(selectedPackage.price))}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Cupos disponibles</span>
              <strong>{selectedPackage.availableSlots}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total estimado ({travelerCount} viajeros)</span>
              <strong>{currencyFormatter.format(Number(totalCents) / 100)}</strong>
            </div>
          </section>
        ) : null}

        {submitError ? <p className="error-message mt-4" role="alert">{submitError}</p> : null}

        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting || packagesLoading || Boolean(packagesError) || !selectedPackage}
          >
            {isSubmitting ? 'Guardando...' : 'Crear reservación'}
          </button>
          <Link to="/reservations" className="secondary-link">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
