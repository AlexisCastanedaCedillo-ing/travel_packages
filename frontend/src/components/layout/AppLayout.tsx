import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/packages', label: 'Paquetes' },
  { to: '/reservations', label: 'Reservaciones' },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>

        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">VL</span>
            <div>
              <strong>Viajes Lili</strong>
              <small>{user?.role ?? 'usuario'}</small>
            </div>
          </div>

          <button type="button" className="logout-button" onClick={logout}>
            Cerrar sesión
          </button>
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
      </aside>

      <main id="main-content" className="content-panel" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
