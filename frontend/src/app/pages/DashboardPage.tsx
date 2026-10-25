import { useAuthStore } from '../../store/authStore';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="page-header">
      <p className="eyebrow">Panel principal</p>
      <h1>Bienvenido{user ? `, ${user.email}` : ''}</h1>
      <p className="page-description">
        Bienvenido al panel principal.
      </p>
    </div>
  );
}
