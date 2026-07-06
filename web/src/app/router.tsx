import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from '@/components/layout/guards';
import { AppShell } from '@/components/layout/AppShell';
import HomePage from '@/features/home/HomePage';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ResetPage from '@/features/auth/ResetPage';
import PendingApprovalPage from '@/features/auth/PendingApprovalPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import SuppliersPage from '@/features/suppliers/SuppliersPage';
import PurchaseOrdersPage from '@/features/suppliers/PurchaseOrdersPage';
import ReportsPage from '@/features/reports/ReportsPage';
import StoreSettingsPage from '@/features/settings/StoreSettingsPage';
import PosPage from '@/features/pos/PosPage';
import ReceiptPage from '@/features/sales/ReceiptPage';
import CustomersPage from '@/features/customers/CustomersPage';
import CustomerProfile from '@/features/customers/CustomerProfile';
import ProductsPage from '@/features/products/ProductsPage';
import CategoriesPage from '@/features/categories/CategoriesPage';
import InventoryPage from '@/features/inventory/InventoryPage';
import SalesPage from '@/features/sales/SalesPage';
import EmployeesPage from '@/features/employees/EmployeesPage';
import OverviewPage from '@/features/admin/OverviewPage';
import TenantsPage from '@/features/admin/TenantsPage';
import ApprovalsPage from '@/features/admin/ApprovalsPage';
import UsersPage from '@/features/admin/UsersPage';
import PlansPage from '@/features/admin/PlansPage';
import SecurityPage from '@/features/admin/SecurityPage';
import AuditPage from '@/features/admin/AuditPage';
import SystemSettingsPage from '@/features/admin/SystemSettingsPage';
import { Forbidden, NotFound } from '@/pages/ErrorPages';

const STORE = ['owner', 'manager', 'cashier'] as const;

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset" element={<ResetPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/403" element={<Forbidden />} />

        {/* protected shell */}
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          {/* store */}
          <Route path="/dashboard" element={<RequireRole roles={['owner', 'manager']}><DashboardPage /></RequireRole>} />
          <Route path="/pos" element={<RequireRole roles={['owner', 'cashier']}><PosPage /></RequireRole>} />
          <Route path="/sales" element={<RequireRole roles={[...STORE]}><SalesPage /></RequireRole>} />
          <Route path="/sales/:invoiceNo/receipt" element={<RequireRole roles={[...STORE]}><ReceiptPage /></RequireRole>} />
          <Route path="/products" element={<RequireRole roles={['owner', 'manager']}><ProductsPage /></RequireRole>} />
          <Route path="/categories" element={<RequireRole roles={['owner']}><CategoriesPage /></RequireRole>} />
          <Route path="/inventory" element={<RequireRole roles={['owner', 'manager']}><InventoryPage /></RequireRole>} />
          <Route path="/customers" element={<RequireRole roles={[...STORE]}><CustomersPage /></RequireRole>} />
          <Route path="/customers/:id" element={<RequireRole roles={[...STORE]}><CustomerProfile /></RequireRole>} />
          <Route path="/suppliers" element={<RequireRole roles={['owner']}><SuppliersPage /></RequireRole>} />
          <Route path="/purchase-orders" element={<RequireRole roles={['owner']}><PurchaseOrdersPage /></RequireRole>} />
          <Route path="/reports" element={<RequireRole roles={['owner', 'manager']}><ReportsPage /></RequireRole>} />
          <Route path="/employees" element={<RequireRole roles={['owner', 'manager']}><EmployeesPage /></RequireRole>} />
          <Route path="/settings" element={<RequireRole roles={['owner']}><StoreSettingsPage /></RequireRole>} />
          {/* platform admin */}
          <Route path="/admin/overview" element={<RequireRole roles={['platform_admin']}><OverviewPage /></RequireRole>} />
          <Route path="/admin/stores" element={<RequireRole roles={['platform_admin']}><TenantsPage /></RequireRole>} />
          <Route path="/admin/approvals" element={<RequireRole roles={['platform_admin']}><ApprovalsPage /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole roles={['platform_admin']}><UsersPage /></RequireRole>} />
          <Route path="/admin/plans" element={<RequireRole roles={['platform_admin']}><PlansPage /></RequireRole>} />
          <Route path="/admin/security" element={<RequireRole roles={['platform_admin']}><SecurityPage /></RequireRole>} />
          <Route path="/admin/audit" element={<RequireRole roles={['platform_admin']}><AuditPage /></RequireRole>} />
          <Route path="/admin/settings" element={<RequireRole roles={['platform_admin']}><SystemSettingsPage /></RequireRole>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
