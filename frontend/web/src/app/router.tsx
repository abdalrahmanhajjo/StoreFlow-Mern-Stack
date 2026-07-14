import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from '@/components/layout/guards';
import { AppShell } from '@/components/layout/AppShell';
import { Error500 } from '@/components/feedback/ErrorBoundary';
import { Forbidden, NotFound } from '@/pages/ErrorPages';
import { SkeletonCard } from '@/components/ui/Skeleton';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const PricingPage = lazy(() => import('@/features/pricing/PricingPage'));
const TermsPage = lazy(() => import('@/features/legal/TermsPage'));
const PrivacyPage = lazy(() => import('@/features/legal/PrivacyPage'));
const SecurityLegalPage = lazy(() => import('@/features/legal/SecurityPage'));
const LegalNoticePage = lazy(() => import('@/features/legal/LegalNoticePage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const ResetPage = lazy(() => import('@/features/auth/ResetPage'));
const ResendVerificationPage = lazy(() => import('@/features/auth/ResendVerificationPage'));
const AcceptInvitePage = lazy(() => import('@/features/auth/AcceptInvitePage'));
const PendingApprovalPage = lazy(() => import('@/features/auth/PendingApprovalPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage'));
const PurchaseOrdersPage = lazy(() => import('@/features/suppliers/PurchaseOrdersPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const StoreSettingsPage = lazy(() => import('@/features/settings/StoreSettingsPage'));
const BillingPage = lazy(() => import('@/features/settings/BillingPage'));
const CheckoutCompletePage = lazy(() => import('@/features/billing/CheckoutCompletePage'));
const DemoCheckoutPage = lazy(() => import('@/features/billing/DemoCheckoutPage'));
const InvoicesPage = lazy(() => import('@/features/billing/InvoicesPage'));
const CancelSubscriptionPage = lazy(() => import('@/features/billing/CancelSubscriptionPage'));
const PosPage = lazy(() => import('@/features/pos/PosPage'));
const ReceiptPage = lazy(() => import('@/features/sales/ReceiptPage'));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage'));
const CustomerProfile = lazy(() => import('@/features/customers/CustomerProfile'));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage'));
const ProductsImportPage = lazy(() => import('@/features/import/ProductsImportPage'));
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage'));
const SalesPage = lazy(() => import('@/features/sales/SalesPage'));
const EmployeesPage = lazy(() => import('@/features/employees/EmployeesPage'));
const OverviewPage = lazy(() => import('@/features/admin/OverviewPage'));
const TenantsPage = lazy(() => import('@/features/admin/TenantsPage'));
const ApprovalsPage = lazy(() => import('@/features/admin/ApprovalsPage'));
const UsersPage = lazy(() => import('@/features/admin/UsersPage'));
const PlansPage = lazy(() => import('@/features/admin/PlansPage'));
const SecurityPage = lazy(() => import('@/features/admin/SecurityPage'));
const AuditPage = lazy(() => import('@/features/admin/AuditPage'));
const SystemSettingsPage = lazy(() => import('@/features/admin/SystemSettingsPage'));
const ModerationPage = lazy(() => import('@/features/admin/ModerationPage'));
const AdminBillingPage = lazy(() => import('@/features/admin/AdminBillingPage'));

const STORE = ['owner', 'manager', 'cashier'] as const;

function PageSkeleton() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ height: 11, width: '20%', background: 'var(--line-soft)', borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 22, width: '35%', background: 'var(--line-soft)', borderRadius: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginBottom: 18 }}>
        {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} lines={2} />)}
      </div>
      <SkeletonCard lines={5} />
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/security" element={<SecurityLegalPage />} />
          <Route path="/legal" element={<LegalNoticePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} />
          {/* Target of the emailed reset link (?token=…) */}
          <Route path="/reset-password" element={<ResetPage />} />
          {/* Target of the employee invite email */}
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/billing/checkout/complete" element={<CheckoutCompletePage />} />
          {/* Simulated hosted checkout — served by the backend mock billing
              provider only (development without Stripe keys). */}
          <Route path="/billing/checkout/demo" element={<DemoCheckoutPage />} />
          <Route path="/403" element={<Forbidden />} />
          <Route path="/500" element={<Error500 />} />

          {/* protected shell */}
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            {/* store */}
            <Route path="/dashboard" element={<RequireRole roles={['owner', 'manager']}><DashboardPage /></RequireRole>} />
            <Route path="/pos" element={<RequireRole roles={['owner', 'manager', 'cashier']}><PosPage /></RequireRole>} />
            <Route path="/sales" element={<RequireRole roles={[...STORE]}><SalesPage /></RequireRole>} />
            <Route path="/sales/:invoiceNo/receipt" element={<RequireRole roles={[...STORE]}><ReceiptPage /></RequireRole>} />
            <Route path="/products" element={<RequireRole roles={['owner', 'manager']}><ProductsPage /></RequireRole>} />
            <Route path="/products/import" element={<RequireRole roles={['owner', 'manager']}><ProductsImportPage /></RequireRole>} />
            <Route path="/categories" element={<RequireRole roles={['owner', 'manager']}><CategoriesPage /></RequireRole>} />
            <Route path="/inventory" element={<RequireRole roles={['owner', 'manager']}><InventoryPage /></RequireRole>} />
            <Route path="/customers" element={<RequireRole roles={[...STORE]}><CustomersPage /></RequireRole>} />
            <Route path="/customers/:id" element={<RequireRole roles={[...STORE]}><CustomerProfile /></RequireRole>} />
            <Route path="/suppliers" element={<RequireRole roles={['owner', 'manager']}><SuppliersPage /></RequireRole>} />
            <Route path="/purchase-orders" element={<RequireRole roles={['owner', 'manager']}><PurchaseOrdersPage /></RequireRole>} />
            <Route path="/reports" element={<RequireRole roles={['owner', 'manager']}><ReportsPage /></RequireRole>} />
            <Route path="/employees" element={<RequireRole roles={['owner']}><EmployeesPage /></RequireRole>} />
            <Route path="/settings" element={<RequireRole roles={['owner']}><StoreSettingsPage /></RequireRole>} />
            <Route path="/settings/billing" element={<RequireRole roles={['owner']}><BillingPage /></RequireRole>} />
            <Route path="/settings/billing/invoices" element={<RequireRole roles={['owner']}><InvoicesPage /></RequireRole>} />
            <Route path="/settings/billing/cancel" element={<RequireRole roles={['owner']}><CancelSubscriptionPage /></RequireRole>} />
            {/* platform admin */}
            <Route path="/admin/overview" element={<RequireRole roles={['platform_admin']}><OverviewPage /></RequireRole>} />
            <Route path="/admin/stores" element={<RequireRole roles={['platform_admin']}><TenantsPage /></RequireRole>} />
            <Route path="/admin/approvals" element={<RequireRole roles={['platform_admin']}><ApprovalsPage /></RequireRole>} />
            <Route path="/admin/users" element={<RequireRole roles={['platform_admin']}><UsersPage /></RequireRole>} />
            <Route path="/admin/plans" element={<RequireRole roles={['platform_admin']}><PlansPage /></RequireRole>} />
            <Route path="/admin/security" element={<RequireRole roles={['platform_admin']}><SecurityPage /></RequireRole>} />
            <Route path="/admin/audit" element={<RequireRole roles={['platform_admin']}><AuditPage /></RequireRole>} />
            <Route path="/admin/settings" element={<RequireRole roles={['platform_admin']}><SystemSettingsPage /></RequireRole>} />
            <Route path="/admin/moderation" element={<RequireRole roles={['platform_admin']}><ModerationPage /></RequireRole>} />
            <Route path="/admin/billing" element={<RequireRole roles={['platform_admin']}><AdminBillingPage /></RequireRole>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
