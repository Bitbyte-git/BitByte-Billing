import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CheckCircle2, FileText, IndianRupee, ReceiptText, ShieldAlert,
  Sparkles, Star, TrendingUp, Zap, Clock, ArrowRight, Plus,
  BarChart2, Users, ShieldCheck, Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { currency, formatDate, getClientName, recordId } from '../utils/format.js';

const colors = ['#7444DC', '#8D6BE2', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
  return { text: 'Good evening', emoji: '🌙' };
}

function getFirstName(name = '') {
  return name.split(' ')[0] || name;
}

const roleConfig = {
  Client: {
    gradient: 'from-[#111436] via-[#1B1A47] to-[#422698]',
    accentGradient: 'from-purple-500/20 to-violet-600/20',
    badge: 'Client Portal',
    badgeColor: 'bg-lavender/20 text-lavender border-lavender/30',
    subtitle: 'Your personal billing hub — track quotations, invoices, and payments in real-time.',
    quickActions: [
      { label: 'New Quotation', icon: Plus, to: '/client/new-quotation', gradient: 'from-purple to-violet' },
      { label: 'My Quotations', icon: FileText, to: '/client/quotations', gradient: 'from-blue-500 to-indigo-600' },
      { label: 'Track Status', icon: Clock, to: '/client/status-tracking', gradient: 'from-emerald-500 to-teal-600' },
    ],
    tip: 'Tip: You can track every stage of your quotation — from submission to payment.',
  },
  Accountant: {
    gradient: 'from-[#0f2027] via-[#1B1A47] to-[#203a43]',
    accentGradient: 'from-blue-500/20 to-teal-600/20',
    badge: 'Accountant Portal',
    badgeColor: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
    subtitle: 'Review quotations, manage pricing, and track revenue — all in one place.',
    quickActions: [
      { label: 'Review Quotations', icon: FileText, to: '/accountant/quotations', gradient: 'from-blue-500 to-indigo-600' },
      { label: 'Add Pricing', icon: IndianRupee, to: '/accountant/pricing', gradient: 'from-emerald-500 to-teal-600' },
      { label: 'Reports', icon: BarChart2, to: '/accountant/reports', gradient: 'from-purple to-violet' },
    ],
    tip: 'You have pending quotations awaiting pricing review. Check the queue.',
  },
  Admin: {
    gradient: 'from-[#0a0a1a] via-[#111436] to-[#2d1b69]',
    accentGradient: 'from-violet-500/20 to-purple-600/20',
    badge: 'Admin Portal',
    badgeColor: 'bg-violet-400/20 text-violet-300 border-violet-400/30',
    subtitle: 'Full system control — manage clients, approvals, invoices, users, and analytics.',
    quickActions: [
      { label: 'Approvals', icon: ShieldCheck, to: '/admin/approvals', gradient: 'from-amber-500 to-orange-600' },
      { label: 'All Clients', icon: Users, to: '/admin/clients', gradient: 'from-blue-500 to-indigo-600' },
      { label: 'Notifications', icon: Bell, to: '/admin/notifications', gradient: 'from-purple to-violet' },
    ],
    tip: 'Admin view: All pending approvals require your attention to proceed.',
  },
};

const floatVariants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.15, 1],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export default function Dashboard({ role, reports = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', summary: null, quotations: [], invoices: [] });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const requests = role === 'Client'
      ? [api.get('/reports/dashboard'), api.get('/quotations'), api.get('/invoices')]
      : [api.get('/reports/dashboard'), api.get('/quotations'), Promise.resolve({ data: [] })];

    Promise.all(requests)
      .then(([summaryRes, quotationsRes, invoicesRes]) => {
        if (active) setState({ loading: false, error: '', summary: summaryRes.data, quotations: quotationsRes.data, invoices: invoicesRes.data });
      })
      .catch((err) => {
        if (active) setState((current) => ({ ...current, loading: false, error: err.response?.data?.message || 'Unable to load dashboard.' }));
      });
    return () => { active = false; };
  }, []);

  const { summary, quotations, invoices } = state;
  const statusData = useMemo(() => Object.entries(summary?.statusDistribution || {}).map(([name, value]) => ({ name, value })), [summary]);
  const revenueData = useMemo(() => Object.entries(summary?.revenueByMonth || {}).map(([month, value]) => ({ month, value })), [summary]);
  const primaryChartData = role === 'Client'
    ? statusData.map((item) => ({ month: item.name, value: item.value }))
    : revenueData;
  const totalValue = summary?.totalValue || 0;
  const paid = summary?.totalRevenue || 0;
  const outstanding = summary?.outstandingAmount || 0;
  const pendingInvoices = useMemo(() => invoices
    .map((invoice) => {
      const total = Number(invoice.totalAmount || 0);
      const paidAmount = Number(invoice.amountPaid || 0);
      const balance = Number(invoice.balanceDue ?? Math.max(total - paidAmount, 0));
      return { ...invoice, total, paidAmount, balance };
    })
    .filter((invoice) => invoice.balance > 0)
    .sort((a, b) => new Date(a.dueDate || a.createdAt || 0) - new Date(b.dueDate || b.createdAt || 0)), [invoices]);
  const nextPendingInvoice = pendingInvoices[0];

  const cards = role === 'Client'
    ? [
      ['Total quotations', summary?.totalQuotations || 0, FileText, 'purple'],
      ['Approved', summary?.statusDistribution?.Approved || 0, CheckCircle2, 'green'],
      ['Invoice generated', summary?.statusDistribution?.['Invoice Generated'] || 0, ReceiptText, 'blue'],
      ['Total spent', currency(paid), IndianRupee, 'blue']
    ]
    : role === 'Accountant'
      ? [
        ['New quotations', summary?.statusDistribution?.Submitted || 0, FileText, 'blue'],
        ['Pending clarification', summary?.statusDistribution?.['Needs Clarification'] || 0, ShieldAlert, 'amber'],
        ['Invoice generated', summary?.statusDistribution?.['Invoice Generated'] || 0, ReceiptText, 'blue'],
        ['Total quotation value', currency(totalValue), IndianRupee, 'green']
      ]
      : [
        ['Total quotations', summary?.totalQuotations || 0, FileText, 'purple'],
        ['Approved', summary?.statusDistribution?.Approved || 0, CheckCircle2, 'green'],
        ['Invoice generated', summary?.statusDistribution?.['Invoice Generated'] || 0, ReceiptText, 'blue'],
        ['Total revenue', currency(paid), IndianRupee, 'green']
      ];

  const greeting = getGreeting();
  const firstName = getFirstName(user?.name || role);
  const config = roleConfig[role] || roleConfig.Admin;

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div>
      {/* ── Welcome Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br ${config.gradient} p-6 text-white shadow-premium`}
      >
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            variants={floatVariants}
            animate="animate"
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple/20 blur-3xl"
          />
          <motion.div
            variants={floatVariants}
            animate="animate"
            style={{ animationDelay: '1.5s' }}
            className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-violet/25 blur-2xl"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(141,107,226,0.15),transparent_60%)]" />
        </div>

        {/* Live pulse dot */}
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <motion.span
            variants={pulseVariants}
            animate="animate"
            className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
          />
          <span className="text-xs font-semibold text-emerald-300">Live</span>
        </div>

        <div className="relative z-10">
          {/* Role badge */}
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${config.badgeColor}`}>
            <Zap size={11} className="shrink-0" />
            {config.badge}
          </span>

          {/* Greeting + name */}
          <div className="mt-4 flex flex-col gap-1 md:flex-row md:items-end md:gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-300">
                {greeting.emoji} {greeting.text}
              </p>
              <h1 className="mt-1 text-4xl font-black tracking-tight">
                {reports ? 'Reports & Analytics' : (
                  <>
                    Welcome back,{' '}
                    <span className="bg-gradient-to-r from-lavender to-purple-300 bg-clip-text text-transparent">
                      {firstName}
                    </span>
                    !
                  </>
                )}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{config.subtitle}</p>
            </div>
          </div>

          {/* Bottom row: date/time + outstanding */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={13} />
              <span>{dateStr} &nbsp;·&nbsp; {timeStr}</span>
            </div>
            <div className="glass rounded-2xl px-5 py-3">
              <p className="text-xs text-slate-300">Outstanding Balance</p>
              <p className="text-2xl font-black">{currency(outstanding)}</p>
            </div>
          </div>

          {/* Quick action pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            {config.quickActions.map(({ label, icon: Icon, to, gradient }) => (
              <motion.div key={to} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to={to}
                  className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${gradient} px-4 py-2 text-xs font-bold text-white shadow-md transition hover:opacity-90`}
                >
                  <Icon size={14} />
                  {label}
                  <ArrowRight size={12} />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Tip bar */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-5 text-slate-300">{config.tip}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map(([label, value, Icon, tone]) => (
          <StatCard key={label} label={label} value={state.loading ? '...' : value} icon={Icon} tone={tone} />
        ))}
      </motion.div>

      {/* ── Client showcase CTA ── */}
      {role === 'Client' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link
            to="/client/services"
            className="mb-6 flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-purple/20 bg-gradient-to-r from-purple/10 via-white to-violet/10 p-6 shadow-sm transition hover:shadow-premium md:flex-row md:items-center"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple">New</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Explore service samples & portfolio</h2>
              <p className="mt-1 text-sm text-slate-600">Open our full service portfolio presentation before you request a quotation.</p>
            </div>
            <span className="gradient-button inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold">View showcase</span>
          </Link>
        </motion.div>
      )}

      {/* ── Client Pending Payments ── */}
      {role === 'Client' && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          className="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-premium"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-line bg-slate-50 p-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple">Payment Desk</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Pending Payment Details</h2>
              <p className="mt-1 text-sm text-slate-500">Review invoice balances and complete payments securely from your payment workspace.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="rounded-xl border border-line bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase text-slate-400">Pending invoices</p>
                <p className="text-xl font-black text-slate-950">{pendingInvoices.length}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-red-400">Pending amount</p>
                <p className="text-xl font-black text-red-600">{currency(pendingInvoices.reduce((sum, invoice) => sum + invoice.balance, 0))}</p>
              </div>
            </div>
          </div>

          {pendingInvoices.length ? (
            <div className="grid gap-4 p-5 xl:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-2xl border border-line bg-slate-950 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Next Due</p>
                <h3 className="mt-2 text-2xl font-black">{nextPendingInvoice.invoiceId}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-300">{nextPendingInvoice.quotationId?.projectTitle || 'Invoice payment'}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Due Date</p>
                    <p className="mt-1 font-black">{formatDate(nextPendingInvoice.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Paid</p>
                    <p className="mt-1 font-black text-emerald-300">{currency(nextPendingInvoice.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Balance</p>
                    <p className="mt-1 font-black text-red-300">{currency(nextPendingInvoice.balance)}</p>
                  </div>
                </div>
                <Link to="/client/payments" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">
                  Pay pending amount <ArrowRight size={16} />
                </Link>
              </div>

              <div className="space-y-3">
                {pendingInvoices.slice(0, 3).map((invoice) => (
                  <Link
                    key={recordId(invoice)}
                    to="/client/payments"
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-purple/40 hover:bg-purple/5 md:flex-row md:items-center"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-950">{invoice.invoiceId}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{invoice.quotationId?.projectTitle || 'Invoice'} · Due {formatDate(invoice.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase text-slate-400">Balance</p>
                        <p className="font-black text-red-600">{currency(invoice.balance)}</p>
                      </div>
                      <ArrowRight size={18} className="text-purple" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-sm font-black text-emerald-700">No pending payments right now.</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">You are all clear. New invoice balances will appear here automatically.</p>
              </div>
            </div>
          )}
        </motion.section>
      )}

      {state.error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p>}

      {/* ── Charts ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"
      >
        <ChartCard title={role === 'Client' ? 'Quotation Status Chart' : 'Revenue Trend'}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={primaryChartData.length ? primaryChartData : [{ month: 'No data', value: 0 }]}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => role === 'Client' ? value : `${value / 1000}k`} />
              <Tooltip formatter={(value) => role === 'Client' ? value : currency(value)} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#7444DC" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Quotation Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData.length ? statusData : [{ name: 'No data', value: 1 }]}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
              >
                {(statusData.length ? statusData : [{ name: 'No data' }]).map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Recent Activity</h2>
          {role === 'Client' && (
            <button
              onClick={() => navigate('/client/new-quotation')}
              className="gradient-button rounded-xl px-4 py-2 text-sm font-bold"
            >
              Create New Quotation
            </button>
          )}
        </div>
        <DataTable
          columns={[
            { key: 'quotationId', label: 'QT ID' },
            { key: 'client', label: 'Client', render: (row) => getClientName(row) },
            { key: 'projectTitle', label: 'Project' },
            { key: 'totalAmount', label: 'Amount', render: (row) => currency(row.totalAmount) },
            { key: 'status', label: 'Status', badge: true },
            { key: 'updatedAt', label: 'Last Update', render: (row) => formatDate(row.updatedAt || row.submittedAt) }
          ]}
          rows={quotations.slice(0, 5)}
          actions={(row) => <StatusBadge status={row.priorityLevel} key={recordId(row)} />}
        />
      </motion.div>
    </div>
  );
}
