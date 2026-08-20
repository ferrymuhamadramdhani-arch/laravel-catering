import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { CustomerPortalLayout } from '../layouts/CustomerPortalLayout';
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
import { CustomersPage } from '../pages/master-data/CustomersPage';
import { SuppliersPage } from '../pages/master-data/SuppliersPage';
import { DeliveryAreasPage } from '../pages/master-data/DeliveryAreasPage';
import { CouriersPage } from '../pages/master-data/CouriersPage';
import { VehiclesPage } from '../pages/master-data/VehiclesPage';
import { OrdersPage } from '../pages/orders/OrdersPage';
import { PurchaseOrdersPage } from '../pages/procurement/PurchaseOrdersPage';
import { StockInPage } from '../pages/inventory/StockInPage';
import { StockOutPage } from '../pages/inventory/StockOutPage';
import { StockOpnamePage } from '../pages/inventory/StockOpnamePage';
import { StockLedgerPage } from '../pages/inventory/StockLedgerPage';
import { StockTransferPage } from '../pages/inventory/StockTransferPage';
import { BranchesPage } from '../pages/branches/BranchesPage';
import { InvoicesPage } from '../pages/finance/InvoicesPage';
import { KitchenKdsPage } from '../pages/kitchen/KitchenKdsPage';
import { DeliveriesPage } from '../pages/deliveries/DeliveriesPage';
import { DeliveryRouteMapPage } from '../pages/deliveries/DeliveryRouteMapPage';
import { WhatsAppSettingsPage } from '../pages/settings/WhatsAppSettingsPage';
import { AnalyticsDashboardPage } from '../pages/analytics/AnalyticsDashboardPage';
import { SuperAdminDashboardPage } from '../pages/superadmin/SuperAdminDashboardPage';
import { CustomerLandingPage } from '../pages/portal/CustomerLandingPage';
import { CustomerCheckoutPage } from '../pages/portal/CustomerCheckoutPage';
import { OrderTrackingPage } from '../pages/portal/OrderTrackingPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public Customer Portal Routes */}
      <Route element={<CustomerPortalLayout />}>
        <Route path="/p/:slug" element={<CustomerLandingPage />} />
        <Route path="/p/:slug/checkout" element={<CustomerCheckoutPage />} />
        <Route path="/p/:slug/track/:trackingCode" element={<OrderTrackingPage />} />
        <Route path="/p/:slug/track" element={<OrderTrackingPage />} />
        <Route path="/track/:trackingCode" element={<OrderTrackingPage />} />
        <Route path="/track" element={<OrderTrackingPage />} />
      </Route>

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
        <Route path="/master-data/customers" element={<CustomersPage />} />
        <Route path="/master-data/suppliers" element={<SuppliersPage />} />
        <Route path="/master-data/delivery-areas" element={<DeliveryAreasPage />} />
        <Route path="/master-data/couriers" element={<CouriersPage />} />
        <Route path="/master-data/vehicles" element={<VehiclesPage />} />
        <Route path="/menus" element={<Navigate to="/master-data/menus" replace />} />

        {/* Operations & Procurement */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/procurement/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/purchase-orders" element={<Navigate to="/procurement/purchase-orders" replace />} />
        <Route path="/kitchen" element={<KitchenKdsPage />} />
        
        {/* Inventory Sub-Routes */}
        <Route path="/inventory" element={<Navigate to="/inventory/stock-in" replace />} />
        <Route path="/inventory/stock-in" element={<StockInPage />} />
        <Route path="/inventory/stock-out" element={<StockOutPage />} />
        <Route path="/inventory/opname" element={<StockOpnamePage />} />
        <Route path="/inventory/ledgers" element={<StockLedgerPage />} />
        <Route path="/inventory/transfers" element={<StockTransferPage />} />

        <Route path="/deliveries" element={<DeliveriesPage />} />
        <Route path="/deliveries/routes" element={<DeliveryRouteMapPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/finance" element={<InvoicesPage />} />
        <Route path="/finance/invoices" element={<InvoicesPage />} />
        <Route path="/analytics" element={<AnalyticsDashboardPage />} />

        {/* User Management */}
        <Route path="/users" element={<StaffManagementPage />} />
        <Route path="/roles" element={<RoleManagementPage />} />
        
        {/* WhatsApp & Settings */}
        <Route path="/whatsapp" element={<WhatsAppSettingsPage />} />
        <Route path="/settings/whatsapp" element={<WhatsAppSettingsPage />} />
        <Route path="/settings" element={<WhatsAppSettingsPage />} />

        {/* Super Admin SaaS Governance */}
        <Route path="/super-admin" element={<SuperAdminDashboardPage />} />
        <Route path="/super-admin/tenants" element={<SuperAdminDashboardPage />} />
        <Route path="/super-admin/plans" element={<SuperAdminDashboardPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
