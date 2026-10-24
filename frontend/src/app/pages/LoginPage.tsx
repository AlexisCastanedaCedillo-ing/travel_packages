import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { loginSchema, type LoginFormValues } from '../../lib/validators/auth';

const defaultValues: LoginFormValues = {
  email: 'admin@example.com',
  password: 'password123',
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: 'onBlur',
  });

  if (isAuthenticated && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : 'No se pudo iniciar sesión. Verifica tus credenciales.';

      setError('root', { type: 'server', message });
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Acceso del sistema</p>
        <h1>Inicio de sesión</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password ? (
              <span className="field-error">{errors.password.message}</span>
            ) : null}
          </label>

          {errors.root ? <p className="error-message">{errors.root.message}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
