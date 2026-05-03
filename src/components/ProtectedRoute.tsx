import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user || !user.roleName || user.roleName.toUpperCase() !== 'ADMIN') {
    return <Navigate to="/login" replace state={{ unauthorized: true }} />;
  }

  return <Outlet />;
}
