import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPackage, getPackageById, updatePackage } from '../../lib/packages';
import {
  packageFormSchema,
  type PackageFormValues,
} from '../../lib/validators/packages';

const defaultValues: PackageFormValues = {
  destination: '',
  startDate: '',
  endDate: '',
  price: '',
  totalCapacity: 1,
};

type PackageFormPageProps = {
  mode: 'create' | 'edit';
};

export function PackageFormPage({ mode }: PackageFormPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoadingPackage, setIsLoadingPackage] = useState(mode === 'edit' && Boolean(id));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm({
    resolver: zodResolver(packageFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (mode !== 'edit' || !id) {
      reset(defaultValues);
      return;
    }

    void (async () => {
      try {
        const packageItem = await getPackageById(id);
        reset({
          destination: packageItem.destination,
          startDate: packageItem.startDate,
          endDate: packageItem.endDate,
          price: String(packageItem.price ?? ''),
          totalCapacity: Number(packageItem.totalCapacity ?? 1),
        });
      } catch (error) {
        const message =
          error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
            ? error.message
            : 'No se pudo cargar la información del paquete.';

        setError('root', { type: 'server', message });
      } finally {
        setIsLoadingPackage(false);
      }
    })();
  }, [id, mode, reset, setError]);

  async function onSubmit(values: PackageFormValues) {
    try {
      if (mode === 'create') {
        await createPackage(values);
        navigate('/packages', {
          replace: true,
          state: { successMessage: 'Paquete creado correctamente.' },
        });
        return;
      }

      if (id) {
        await updatePackage(id, values);
        navigate('/packages', {
          replace: true,
          state: { successMessage: 'Paquete actualizado correctamente.' },
        });
        return;
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'No se pudo guardar el paquete.';

      setError('root', { type: 'server', message });
    }
  }

  return (
    <div className="page-header">
      <p className="eyebrow">Paquetes</p>
      <h1>{mode === 'create' ? 'Crear paquete' : 'Editar paquete'}</h1>

      {isLoadingPackage ? (
        <div className="page-state compact-state">
          <p role="status" aria-live="polite">Cargando información del paquete...</p>
        </div>
      ) : null}

      {!isLoadingPackage ? (
      <form
        className="package-form"
        onSubmit={handleSubmit((values) => {
          void onSubmit(values as PackageFormValues);
        })}
        noValidate
      >
        <label>
          <span>Destino</span>
          <input
            id="destination"
            type="text"
            placeholder="Cancún, México"
            aria-invalid={Boolean(errors.destination)}
            aria-describedby={errors.destination ? 'destination-error' : undefined}
            {...register('destination')}
          />
          {errors.destination?.message ? (
            <span id="destination-error" className="field-error">{String(errors.destination.message)}</span>
          ) : null}
        </label>

        <div className="form-grid" style={{ marginTop: '.5rem' }}>
          <label>
            <span>Fecha inicio</span>
            <input
              id="startDate"
              type="date"
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate ? 'start-date-error' : undefined}
              {...register('startDate')}
            />
            {errors.startDate?.message ? (
              <span id="start-date-error" className="field-error">{String(errors.startDate.message)}</span>
            ) : null}
          </label>

          <label>
            <span>Fecha fin</span>
            <input
              id="endDate"
              type="date"
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={errors.endDate ? 'end-date-error' : undefined}
              {...register('endDate')}
            />
            {errors.endDate?.message ? (
              <span id="end-date-error" className="field-error">{String(errors.endDate.message)}</span>
            ) : null}
          </label>
        </div>

        <div className="form-grid" style={{ marginTop: '.5rem' }}>
          <label>
            <span>Precio</span>
            <input
              id="price"
              type="text"
              placeholder="899.00"
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? 'price-error' : undefined}
              {...register('price')}
            />
            {errors.price?.message ? (
              <span id="price-error" className="field-error">{String(errors.price.message)}</span>
            ) : null}
          </label>

          <label>
            <span>Capacidad total</span>
            <input
              id="totalCapacity"
              type="number"
              min={1}
              step={1}
              aria-invalid={Boolean(errors.totalCapacity)}
              aria-describedby={errors.totalCapacity ? 'capacity-error' : undefined}
              {...register('totalCapacity')}
            />
            {errors.totalCapacity?.message ? (
              <span id="capacity-error" className="field-error">{String(errors.totalCapacity.message)}</span>
            ) : null}
          </label>
        </div>

        {errors.root ? <p className="error-message" role="alert">{errors.root.message}</p> : null}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear paquete' : 'Guardar cambios'}
          </button>

          <Link to="/packages" className="secondary-link">
            Cancelar
          </Link>
        </div>
      </form>
      ) : null}
    </div>
  );
}
