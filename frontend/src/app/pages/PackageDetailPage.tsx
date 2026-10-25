import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePackagesStore } from '../../store/packagesStore';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'MXN',
});

export function PackageDetailPage() {
  const { id } = useParams();
  const { selectedPackage, isDetailLoading, error, fetchPackageById, clearSelectedPackage } =
    usePackagesStore();

  useEffect(() => {
    if (!id) {
      clearSelectedPackage();
      return;
    }

    void fetchPackageById(id);

    return () => {
      clearSelectedPackage();
    };
  }, [clearSelectedPackage, fetchPackageById, id]);

  if (isDetailLoading) {
    return (
      <div className="page-state">
        <p className="eyebrow">Detalle</p>
        <h1 role="status" aria-live="polite">Cargando paquete...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state">
        <p className="eyebrow">Detalle</p>
        <h1>No se pudo cargar el paquete</h1>
        <p className="page-description" role="alert">{error}</p>
        <Link to="/packages" className="secondary-link">
          Volver a paquetes
        </Link>
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <div className="page-state">
        <p className="eyebrow">Detalle</p>
        <h1>Paquete no encontrado</h1>
        <p className="page-description">
          El paquete solicitado no existe o ya no está disponible.
        </p>
        <Link to="/packages" className="secondary-link">
          Volver a paquetes
        </Link>
      </div>
    );
  }

  const priceValue = Number(selectedPackage.price ?? 0);

  return (
    <div className="page-header">
      <p className="eyebrow">Paquete</p>
      <h1>{selectedPackage.destination}</h1>

      <div className="package-detail-card">
        <div className="detail-row">
          <span className="detail-label">Destino</span>
          <strong>{selectedPackage.destination}</strong>
        </div>

        <div className="detail-row">
          <span className="detail-label">Fechas</span>
          <strong>
            {selectedPackage.startDate} - {selectedPackage.endDate}
          </strong>
        </div>

        <div className="detail-row">
          <span className="detail-label">Precio</span>
          <strong>{currencyFormatter.format(priceValue)}</strong>
        </div>

        <div className="detail-row">
          <span className="detail-label">Cupos disponibles</span>
          <strong>{selectedPackage.availableSlots}</strong>
        </div>

        <div className="detail-row">
          <span className="detail-label">Capacidad total</span>
          <strong>{selectedPackage.totalCapacity}</strong>
        </div>
      </div>

      <div className="detail-actions">
        <Link to="/packages" className="secondary-link">
          Volver a paquetes
        </Link>
      </div>
    </div>
  );
}
