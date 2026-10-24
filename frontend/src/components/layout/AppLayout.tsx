import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/packages', label: 'Paquetes' },
  { to: '/reservations', label: 'Reservas' },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">VL</span>
          <div>
            <strong>Viajes Lili</strong>
            <small>{user?.role ?? 'usuario'}</small>
          </div>
        </div>

        <nav className="nav" aria-label="Menú principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="content-panel">
        <Outlet />
      </main>
    </div>
  );
}
