import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewQuotation from './pages/NewQuotation.jsx';
import TablePage from './pages/TablePage.jsx';
import QuotationDetail from './pages/QuotationDetail.jsx';
import PricingPage from './pages/PricingPage.jsx';
import AdminApproval from './pages/AdminApproval.jsx';
import InvoiceGeneration from './pages/InvoiceGeneration.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AccountantManagement from './pages/AccountantManagement.jsx';
import ClientStatusTracking from './pages/ClientStatusTracking.jsx';
import PaymentOverview from './pages/PaymentOverview.jsx';
import ServiceShowcase from './pages/ServiceShowcase.jsx';
import { useAuth } from './state/AuthContext.jsx';

function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;
  return children;
}

function RoleLayout({ role }) {
  return (
    <RequireAuth roles={[role]}>
      <AppLayout />
    </RequireAuth>
  );
}

export default function App() {
  const { user, booting, roleHome } = useAuth();
  if (booting) return <div className="grid min-h-screen place-items-center bg-surface text-sm font-bold text-slate-500">Loading secure workspace...</div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={roleHome[user.role]} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={roleHome[user.role]} replace /> : <Register />} />
      <Route path="/" element={<Navigate to={user ? roleHome[user.role] : '/login'} replace />} />

      <Route element={<RoleLayout role="Client" />}>
        <Route path="/client/dashboard" element={<Dashboard role="Client" />} />
        <Route path="/client/services" element={<ServiceShowcase />} />
        <Route path="/client/new-quotation" element={<NewQuotation />} />
        <Route path="/client/quotations" element={<TablePage type="quotations" role="Client" />} />
        <Route path="/client/quotations/:id" element={<QuotationDetail role="Client" />} />
        <Route path="/client/status-tracking" element={<ClientStatusTracking />} />
        <Route path="/client/invoices" element={<TablePage type="invoices" role="Client" />} />
        <Route path="/client/payments" element={<PaymentOverview role="Client" />} />
        <Route path="/client/settings" element={<SettingsPage role="Client" />} />
      </Route>

      <Route element={<RoleLayout role="Accountant" />}>
        <Route path="/accountant/dashboard" element={<Dashboard role="Accountant" />} />
        <Route path="/accountant/quotations" element={<TablePage type="quotations" role="Accountant" />} />
        <Route path="/accountant/quotations/:id" element={<QuotationDetail role="Accountant" />} />
        <Route path="/accountant/pricing" element={<PricingPage />} />
        <Route path="/accountant/clarifications" element={<QuotationDetail role="Accountant" mode="clarification" />} />
        <Route path="/accountant/invoices" element={<TablePage type="invoices" role="Accountant" />} />
        <Route path="/accountant/payments" element={<PaymentOverview role="Accountant" />} />
        <Route path="/accountant/reports" element={<Dashboard role="Accountant" reports />} />
        <Route path="/accountant/settings" element={<SettingsPage role="Accountant" />} />
      </Route>

      <Route element={<RoleLayout role="Admin" />}>
        <Route path="/admin/dashboard" element={<Dashboard role="Admin" />} />
        <Route path="/admin/quotations" element={<TablePage type="quotations" role="Admin" />} />
        <Route path="/admin/quotations/:id" element={<QuotationDetail role="Admin" />} />
        <Route path="/admin/approvals" element={<AdminApproval />} />
        <Route path="/admin/invoices/generate" element={<InvoiceGeneration />} />
        <Route path="/admin/clients" element={<TablePage type="clients" role="Admin" />} />
        <Route path="/admin/payments" element={<TablePage type="payments" role="Admin" />} />
        <Route path="/admin/services" element={<TablePage type="services" role="Admin" />} />
        <Route path="/admin/users" element={<TablePage type="users" role="Admin" />} />
        <Route path="/admin/accountants" element={<AccountantManagement />} />
        <Route path="/admin/reports" element={<Dashboard role="Admin" reports />} />
        <Route path="/admin/notifications" element={<SettingsPage role="Admin" notifications />} />
        <Route path="/admin/settings" element={<SettingsPage role="Admin" />} />
      </Route>
    </Routes>
  );
}
