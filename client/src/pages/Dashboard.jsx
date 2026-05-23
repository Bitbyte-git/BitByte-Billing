import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock3, FileText, IndianRupee, ReceiptText, ShieldAlert, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import { currency, formatDate, getClientName, recordId } from '../utils/format.js';

const colors = ['#7444DC', '#8D6BE2', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function Dashboard({ role, reports = false }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', summary: null, quotations: [] });

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/reports/dashboard'), api.get('/quotations')])
      .then(([summaryRes, quotationsRes]) => {
        if (active) setState({ loading: false, error: '', summary: summaryRes.data, quotations: quotationsRes.data });
      })
      .catch((err) => {
        if (active) setState((current) => ({ ...current, loading: false, error: err.response?.data?.message || 'Unable to load dashboard.' }));
      });
    return () => { active = false; };
  }, []);

  const { summary, quotations } = state;
  const statusData = useMemo(() => Object.entries(summary?.statusDistribution || {}).map(([name, value]) => ({ name, value })), [summary]);
  const revenueData = useMemo(() => Object.entries(summary?.revenueByMonth || {}).map(([month, value]) => ({ month, value })), [summary]);
  const primaryChartData = role === 'Client'
    ? statusData.map((item) => ({ month: item.name, value: item.value }))
    : revenueData;
  const totalValue = summary?.totalValue || 0;
  const paid = summary?.totalRevenue || 0;
  const outstanding = summary?.outstandingAmount || 0;

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

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-ink to-violet p-6 text-white shadow-premium">
        <p className="text-sm font-bold uppercase tracking-widest text-lavender">{role} Control Center</p>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-black">{reports ? 'Reports & Analytics' : `Welcome to ${role} Dashboard`}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Track quotation movement from client request to accountant review, admin approval, invoice generation, payment, notification, and audit trail.</p>
          </div>
          <div className="glass rounded-2xl px-5 py-4">
            <p className="text-xs text-slate-300">Outstanding</p>
            <p className="text-2xl font-black">{currency(outstanding)}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, tone]) => <StatCard key={label} label={label} value={state.loading ? '...' : value} icon={Icon} tone={tone} />)}
      </div>

      {role === 'Client' && (
        <Link to="/client/services" className="mb-6 flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-purple/20 bg-gradient-to-r from-purple/10 via-white to-violet/10 p-6 shadow-sm transition hover:shadow-premium md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-purple">New</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Explore service samples & portfolio</h2>
            <p className="mt-1 text-sm text-slate-600">Browse six core services with live work samples before you request a quotation.</p>
          </div>
          <span className="gradient-button inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold">View showcase</span>
        </Link>
      )}

      {state.error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
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
              <Pie data={statusData.length ? statusData : [{ name: 'No data', value: 1 }]} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={4}>
                {(statusData.length ? statusData : [{ name: 'No data' }]).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Recent Activity</h2>
          {role === 'Client' && <button onClick={() => navigate('/client/new-quotation')} className="gradient-button rounded-xl px-4 py-2 text-sm font-bold">Create New Quotation</button>}
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
      </div>
    </div>
  );
}
