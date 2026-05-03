import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './layout/AdminLayout';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminOpsPage } from './pages/AdminOpsPage';
import { AdminIssuesPage } from './pages/AdminIssuesPage';
import { AdminIssueDetailPage } from './pages/AdminIssueDetailPage';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="catalog/categories" element={<CategoriesPage />} />
          <Route path="catalog/products" element={<ProductsPage />} />
          <Route path="supply/inventory" element={<InventoryPage />} />
          <Route path="supply/warehouses" element={<WarehousesPage />} />
          <Route path="supply/suppliers" element={<SuppliersPage />} />
          <Route path="supply/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="supply/promotions" element={<PromotionsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="ops" element={<AdminOpsPage />} />
          <Route path="issues" element={<AdminIssuesPage />} />
          <Route path="issues/:id" element={<AdminIssueDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
