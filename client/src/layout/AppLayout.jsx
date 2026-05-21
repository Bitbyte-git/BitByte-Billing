import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, CircleDollarSign, FileCheck2, FileText, Home, LogOut, Menu, ReceiptText, Search, Settings, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useAuth } from '../state/AuthContext.jsx';

const nav = {
  Client: [
    ['Dashboard', '/client/dashboard', Home],
    ['New Quotation', '/client/new-quotation', FileCheck2],
    ['My Quotations', '/client/quotations', FileText],
    ['Invoices', '/client/invoices', ReceiptText],
    ['Payments', '/client/payments', CircleDollarSign],
    ['Profile & Settings', '/client/settings', Settings]
  ],
  Accountant: [
    ['Dashboard', '/accountant/dashboard', Home],
    ['Quotations', '/accountant/quotations', FileText],
    ['Add Pricing', '/accountant/pricing', CircleDollarSign],
    ['Clarifications', '/accountant/clarifications', FileCheck2],
    ['Invoices', '/accountant/invoices', ReceiptText],
    ['Reports', '/accountant/reports', ChartNoAxesCombined],
    ['Profile & Settings', '/accountant/settings', Settings]
  ],
  Admin: [
    ['Dashboard', '/admin/dashboard', Home],
    ['All Quotations', '/admin/quotations', FileText],
    ['Approvals', '/admin/approvals', ShieldCheck],
    ['Invoice Generation', '/admin/invoices/generate', ReceiptText],
    ['Clients', '/admin/clients', Users],
    ['Payments', '/admin/payments', CircleDollarSign],
    ['Services', '/admin/services', BriefcaseBusiness],
    ['Users', '/admin/users', Users],
    ['Reports', '/admin/reports', ChartNoAxesCombined],
    ['Notifications', '/admin/notifications', Bell],
    ['Settings', '/admin/settings', Wrench]
  ]
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = nav[user.role] || [];
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] overflow-y-auto bg-navy p-4 text-white lg:block">
        <div className="rounded-2xl bg-gradient-to-br from-ink to-panel p-4 shadow-glow">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-purple to-lavender text-sm font-black">BB</div>
            <div>
              <p className="text-sm font-extrabold leading-tight">Bit Byte Technologies</p>
              <p className="text-xs text-slate-300">Billing Operations</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-widest text-slate-400">{user.role} portal</p>
            <p className="mt-1 font-bold">{user.name}</p>
          </div>
        </div>
        <nav className="mt-5 space-y-1">
          {items.map(([label, path, Icon]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-purple text-white shadow-glow' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate('/login'); }} className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/8">
          <LogOut size={18} /> Sign out
        </button>
      </aside>
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-4">
            <button className="rounded-xl border border-line p-2 lg:hidden"><Menu size={20} /></button>
            <label className="hidden flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 md:flex">
              <Search size={18} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Search quotations, invoices, clients..." />
            </label>
            <button className="relative rounded-xl border border-line p-2 text-slate-600">
              <Bell size={19} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold">
              {user.name.split(' ')[0]} <ChevronDown size={16} />
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
