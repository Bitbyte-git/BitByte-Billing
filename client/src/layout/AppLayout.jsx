import {
  Activity,
  Bell,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo.jsx";
import { useAuth } from "../state/AuthContext.jsx";

const nav = {
  Client: [
    ["Dashboard", "/client/dashboard", Home],
    ["Service Showcase", "/client/services", LayoutGrid],
    ["New Quotation", "/client/new-quotation", FileCheck2],
    ["My Quotations", "/client/quotations", FileText],
    ["Status Tracking", "/client/status-tracking", Activity],
    ["Invoices", "/client/invoices", ReceiptText],
    ["Payments", "/client/payments", CircleDollarSign],
    ["Profile & Settings", "/client/settings", Settings],
  ],
  Accountant: [
    ["Dashboard", "/accountant/dashboard", Home],
    ["Quotations", "/accountant/quotations", FileText],
    ["Add Pricing", "/accountant/pricing", CircleDollarSign],
    ["Clarifications", "/accountant/clarifications", FileCheck2],
    ["Invoices", "/accountant/invoices", ReceiptText],
    ["Intern Form", "/accountant/intern-invoices/new", ReceiptText],
    ["Intern Invoices", "/accountant/intern-invoices", FileText],
    ["Payments", "/accountant/payments", CircleDollarSign],
    ["Reports", "/accountant/reports", ChartNoAxesCombined],
    ["Profile & Settings", "/accountant/settings", Settings],
  ],
  Admin: [
    ["Dashboard", "/admin/dashboard", Home],
    ["All Quotations", "/admin/quotations", FileText],
    ["Approvals", "/admin/approvals", ShieldCheck],
    ["Invoice Generation", "/admin/invoices/generate", ReceiptText],
    ["Intern Form", "/admin/intern-invoices/new", ReceiptText],
    ["Intern Invoices", "/admin/intern-invoices", FileText],
    ["Clients", "/admin/clients", Users],
    ["Payments", "/admin/payments", CircleDollarSign],
    ["Services", "/admin/services", BriefcaseBusiness],
    ["Users", "/admin/users", Users],
    ["Accountants", "/admin/accountants", UserCog],
    ["Reports", "/admin/reports", ChartNoAxesCombined],
    ["Notifications", "/admin/notifications", Bell],
    ["Settings", "/admin/settings", Wrench],
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = nav[user.role] || [];
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col overflow-y-auto bg-navy p-4 text-white lg:flex">
        <div className="rounded-2xl bg-gradient-to-br from-ink to-panel p-4 shadow-glow">
          <BrandLogo
            size="md"
            theme="dark"
            tagline=""
            role={`${user.role} portal`}
          />
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="truncate text-sm font-bold text-white">
              {user.name}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {user.role}
            </p>
          </div>
        </div>
        <nav className="mt-5 flex-1 space-y-1.5">
          {items.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${isActive ? "bg-purple text-white shadow-glow" : "text-slate-300 hover:bg-white/8 hover:text-white"}`
              }
            >
              <Icon className="shrink-0" size={18} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-5 flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="shrink-0" size={18} />
          <span className="truncate">Sign out</span>
        </button>
      </aside>
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8 lg:hidden">
          <div className="flex items-center gap-4">
            <button className="rounded-xl border border-line p-2 lg:hidden">
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <BrandLogo size="sm" theme="light" tagline="" />
            </div>
          </div>
        </header>
        <div className="page-enter p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
