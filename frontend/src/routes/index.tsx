import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterTenantPage } from '../pages/auth/RegisterTenantPage';
import { OnboardingWizardPage } from '../pages/onboarding/OnboardingWizardPage';
import { DashboardPage } from '../pages/admin/DashboardPage';
import { StaffManagementPage } from '../pages/admin/StaffManagementPage';
import { RoleManagementPage } from '../pages/admin/RoleManagementPage';
import { RawMaterialsPage } from '../pages/master-data/RawMaterialsPage';
import { MenuCategoriesPage } from '../pages/master-data/MenuCategoriesPage';
import { MenuItemsPage } from '../pages/master-data/MenuItemsPage';
import { MenuPackagesPage } from '../pages/master-data/MenuPackagesPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-tenant" element={<RegisterTenantPage />} />
      </Route>

      {/* Onboarding Wizard Route (Protected) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingWizardPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Master Data Routes */}
        <Route path="/master-data/materials" element={<RawMaterialsPage />} />
        <Route path="/master-data/categories" element={<MenuCategoriesPage />} />
        <Route path="/master-data/menus" element={<MenuItemsPage />} />
        <Route path="/master-data/packages" element={<MenuPackagesPage />} />
        <Route path="/menus" element={<Navigate to="/master-data/menus" replace />} />

        {/* Operations */}
        <Route path="/orders" element={<DashboardPage />} />
        <Route path="/kitchen" element={<DashboardPage />} />
        <Route path="/inventory" element={<Navigate to="/master-data/materials" replace />} />
        <Route path="/deliveries" element={<DashboardPage />} />
        <Route path="/finance" element={<DashboardPage />} />

        {/* User Management */}
        <Route path="/users" element={<StaffManagementPage />} />
        <Route path="/roles" element={<RoleManagementPage />} />
        
        {/* Settings */}
        <Route path="/settings" element={<DashboardPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
