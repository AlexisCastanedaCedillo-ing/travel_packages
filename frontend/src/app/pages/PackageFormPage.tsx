import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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

      <form
        className="package-form"
        onSubmit={handleSubmit((values) => {
          void onSubmit(values as PackageFormValues);
        })}
        noValidate
      >
        <label>
          <span>Destino</span>
          <input type="text" placeholder="Cancún, México" {...register('destination')} />
          {errors.destination?.message ? (
            <span className="field-error">{String(errors.destination.message)}</span>
          ) : null}
        </label>

        <div className="form-grid" style={{ marginTop: '.5rem' }}>
          <label>
            <span>Fecha inicio</span>
            <input type="date" {...register('startDate')} />
            {errors.startDate?.message ? (
              <span className="field-error">{String(errors.startDate.message)}</span>
            ) : null}
          </label>

          <label>
            <span>Fecha fin</span>
            <input type="date" {...register('endDate')} />
            {errors.endDate?.message ? (
              <span className="field-error">{String(errors.endDate.message)}</span>
            ) : null}
          </label>
        </div>

        <div className="form-grid" style={{ marginTop: '.5rem' }}>
          <label>
            <span>Precio</span>
            <input type="text" placeholder="899.00" {...register('price')} />
            {errors.price?.message ? (
              <span className="field-error">{String(errors.price.message)}</span>
            ) : null}
          </label>

          <label>
            <span>Capacidad total</span>
            <input type="number" min={1} step={1} {...register('totalCapacity')} />
            {errors.totalCapacity?.message ? (
              <span className="field-error">{String(errors.totalCapacity.message)}</span>
            ) : null}
          </label>
        </div>

        {errors.root ? <p className="error-message">{errors.root.message}</p> : null}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear paquete' : 'Guardar cambios'}
          </button>

          <Link to="/packages" className="secondary-link">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
