import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './layout/AdminLayout';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';
import { AiHealthPage } from './pages/AiHealthPage';
import { AdminIssuesPage } from './pages/AdminIssuesPage';
import { AdminIssueDetailPage } from './pages/AdminIssueDetailPage';
import { StaffProtectedRoute } from './components/StaffProtectedRoute';
import { StaffLayout } from './layout/StaffLayout';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { StaffCustomersPage } from './pages/StaffCustomersPage';
import { RegisterPage } from './pages/RegisterPage';
import { CustomersPage } from './pages/CustomersPage';
import { StaffPage } from './pages/StaffPage';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="catalog/categories" element={<CategoriesPage />} />
          <Route path="catalog/products" element={<ProductsPage />} />
          <Route path="supply/inventory" element={<InventoryPage />} />
          <Route path="supply/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="supply/promotions" element={<PromotionsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="staff-management" element={<StaffPage />} />
          <Route path="issues" element={<AdminIssuesPage />} />
          <Route path="issues/:id" element={<AdminIssueDetailPage />} />
          <Route path="ai-health" element={<AiHealthPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/staff-list" element={<StaffPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
        </Route>
      </Route>

      <Route path="/staff" element={<StaffProtectedRoute />}>
        <Route element={<StaffLayout />}>
          <Route index element={<StaffDashboardPage />} />
          <Route path="customers" element={<StaffCustomersPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
