import {
  Activity,
  Bell,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronDown,
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
import { LOGO_SOURCES } from "../config/brand.js";
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
    ["Payments", "/accountant/payments", CircleDollarSign],
    ["Reports", "/accountant/reports", ChartNoAxesCombined],
    ["Profile & Settings", "/accountant/settings", Settings],
  ],
  Admin: [
    ["Dashboard", "/admin/dashboard", Home],
    ["All Quotations", "/admin/quotations", FileText],
    ["Approvals", "/admin/approvals", ShieldCheck],
    ["Invoice Generation", "/admin/invoices/generate", ReceiptText],
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] overflow-y-auto bg-navy p-4 text-white lg:block">
        <div className="rounded-2xl bg-gradient-to-br from-ink to-panel p-4 shadow-glow">
          <BrandLogo
            size="md"
            theme="dark"
            tagline=""
            role={`${user.role} portal`}
          />
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-slate-300">{user.name}</p>
          </div>
        </div>
        <nav className="mt-5 space-y-1">
          {items.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? "bg-purple text-white shadow-glow" : "text-slate-300 hover:bg-white/8 hover:text-white"}`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/8"
        >
          <LogOut size={18} /> Sign out
        </button>
      </aside>
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-4">
            <button className="rounded-xl border border-line p-2 lg:hidden">
              <Menu size={20} />
            </button>
            <div className="lg:hidden">
              <BrandLogo size="sm" theme="light" tagline="" />
            </div>
            <label className="hidden flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 md:flex">
              <img
                src={LOGO_SOURCES[0]}
                alt=""
                className="h-5 w-5 rounded object-contain"
              />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Search quotations, invoices, clients..."
              />
            </label>
            <button className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold">
              {user.name.split(" ")[0]} <ChevronDown size={16} />
            </button>
          </div>
        </header>
        <div className="page-enter p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
