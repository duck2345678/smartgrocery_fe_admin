import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function StaffProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = user?.roleName?.toUpperCase();
  if (!user || (role !== 'STAFF' && role !== 'ADMIN')) {
    return <Navigate to="/login" replace state={{ unauthorized: true }} />;
  }

  return <Outlet />;
}
