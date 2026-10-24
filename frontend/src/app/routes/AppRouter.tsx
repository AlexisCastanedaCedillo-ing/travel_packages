import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../components/guards/ProtectedRoute';
import { RoleRoute } from '../../components/guards/RoleRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PackagesPage } from '../pages/PackagesPage';
import { ReservationsPage } from '../pages/ReservationsPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<RoleRoute allowedRoles={['admin', 'agent', 'customer']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'agent', 'customer']} />}>
            <Route path="/packages" element={<PackagesPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['admin', 'agent', 'customer']} />}>
            <Route path="/reservations" element={<ReservationsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
