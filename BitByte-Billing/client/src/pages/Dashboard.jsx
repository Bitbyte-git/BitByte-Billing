import { useEffect, useState, useMemo } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Clock3, FileText, IndianRupee, ReceiptText, ShieldAlert } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency } from '../utils/constants.js';
import { quotationsAPI, invoicesAPI } from '../api.js';
import { Link } from 'react-router-dom';

const colors = ['#7444DC', '#8D6BE2', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function Dashboard({ role, reports = false }) {
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      quotationsAPI.list().catch(() => []),
      invoicesAPI.list().catch(() => [])
    ]).then(([qRes, iRes]) => {
      setQuotations(Array.isArray(qRes) ? qRes : qRes.quotations || []);
      setInvoices(Array.isArray(iRes) ? iRes : iRes.invoices || []);
    }).finally(() => setLoading(false));
  }, []);

  const statusData = useMemo(() => {
    const counts = quotations.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [quotations]);

  const revenueData = useMemo(() => {
    const data = {};
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      data[monthName] = 0;
    }
    
    invoices.forEach(i => {
      const d = new Date(i.invoiceDate || i.createdAt);
      if (!isNaN(d.getTime())) {
         const monthName = d.toLocaleString('default', { month: 'short' });
         if (data[monthName] !== undefined) {
           // We can count all invoice totals or just Paid. Let's count all that are not Cancelled.
           if (i.paymentStatus !== 'Cancelled') {
             data[monthName] += (i.totalAmount || 0);
           }
         }
      }
    });
    
    return Object.entries(data).map(([month, value]) => ({ month, value }));
  }, [invoices]);

  const totalValue = quotations.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const paid = invoices.reduce((sum, item) => sum + (item.paymentStatus === 'Paid' ? item.totalAmount : 0), 0);
  const outstanding = invoices.reduce((sum, item) => sum + (item.paymentStatus !== 'Paid' ? item.totalAmount : 0), 0);

  const cards = role === 'Client'
    ? [
      ['Total quotations', quotations.length, FileText, 'purple'],
      ['Under review', quotations.filter((item) => item.status === 'Forwarded to Admin').length, Clock3, 'amber'],
      ['Approved', quotations.filter((item) => item.status === 'Approved').length, CheckCircle2, 'green'],
      ['Total spent', currency(paid), IndianRupee, 'blue']
    ]
    : role === 'Accountant'
      ? [
        ['New quotations', quotations.filter((item) => item.status === 'Submitted').length, FileText, 'blue'],
        ['Under review', quotations.filter((item) => item.status === 'Forwarded to Admin').length, Clock3, 'purple'],
        ['Pending clarification', quotations.filter((item) => item.status === 'Needs Clarification').length, ShieldAlert, 'amber'],
        ['Total quotation value', currency(totalValue), IndianRupee, 'green']
      ]
      : [
        ['Total quotations', quotations.length, FileText, 'purple'],
        ['Approved', quotations.filter((item) => item.status === 'Approved').length, CheckCircle2, 'green'],
        ['Invoice generated', quotations.filter((item) => item.status === 'Invoice Generated').length, ReceiptText, 'blue'],
        ['Total revenue', currency(paid), IndianRupee, 'green']
      ];

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold">Loading dashboard data...</div>;

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
        {cards.map(([label, value, Icon, tone]) => <StatCard key={label} label={label} value={value} icon={Icon} tone={tone} delta="+12.4% from last month" />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <ChartCard title={role === 'Client' ? 'Quotation Status Chart' : 'Revenue Trend'}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7444DC" stopOpacity={1} />
                  <stop offset="100%" stopColor="#8D6BE2" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip formatter={(value) => currency(value)} cursor={{ fill: 'rgba(116, 68, 220, 0.05)' }} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="url(#barGradient)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Quotation Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={4}>
                {statusData.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Recent Activity</h2>
          {role === 'Client' && (
            <Link to="/client/new-quotation" className="gradient-button rounded-xl px-6 py-3 text-sm font-bold">Create New Quotation</Link>
          )}
        </div>
        <DataTable
          columns={[
            { key: 'quotationId', label: 'QT ID' },
            { key: 'projectTitle', label: 'Project' },
            { key: 'amount', label: 'Amount', render: (row) => currency(row.subtotal || 0) },
            { key: 'status', label: 'Status', badge: true },
            { key: 'updatedAt', label: 'Last Update', render: (row) => new Date(row.updatedAt).toLocaleDateString() }
          ]}
          rows={quotations.slice(0, 5)}
          actions={(row) => <StatusBadge status={row.priorityLevel} />}
        />
      </div>
    </div>
  );
}
