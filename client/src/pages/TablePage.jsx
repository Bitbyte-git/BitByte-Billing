import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Eye, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import SearchFilterBar from '../components/SearchFilterBar.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import { currency, formatDate, getClientName, getInvoiceNumber, getQuotationNumber, recordId, serviceNames } from '../utils/format.js';

export default function TablePage({ type, role }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState({ loading: true, error: '', data: [] });
  const endpoint = {
    quotations: '/quotations',
    invoices: '/invoices',
    payments: '/payments',
    clients: '/clients',
    services: '/services',
    users: '/auth/users'
  }[type];

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '', data: [] });
    api.get(endpoint)
      .then(({ data }) => {
        if (active) setState({ loading: false, error: '', data });
      })
      .catch((err) => {
        if (active) setState({ loading: false, error: err.response?.data?.message || 'Unable to load records.', data: [] });
      });
    return () => { active = false; };
  }, [endpoint]);

  const data = state.data;
  const rows = useMemo(() => data.filter((row) => {
    const blob = JSON.stringify(row).toLowerCase();
    return blob.includes(search.toLowerCase()) && (!status || row.status === status || row.paymentStatus === status || row.accountStatus === status);
  }), [data, search, status]);

  const config = {
    quotations: {
      title: role === 'Client' ? 'My Quotations' : role === 'Accountant' ? 'Quotations List' : 'All Quotations',
      columns: [
        { key: 'quotationId', label: 'QT ID' },
        { key: 'client', label: 'Client', render: (row) => getClientName(row) },
        { key: 'projectTitle', label: 'Project' },
        { key: 'servicesSelected', label: 'Services', render: (row) => serviceNames(row.servicesSelected) },
        { key: 'totalAmount', label: 'Amount', render: (row) => currency(row.totalAmount) },
        { key: 'status', label: 'Status', badge: true },
        { key: 'submittedAt', label: 'Submitted On', render: (row) => formatDate(row.submittedAt || row.createdAt) }
      ],
      actions: (row) => <Link to={`/${role.toLowerCase()}/quotations/${recordId(row)}`} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple"><Eye size={16} /> View</Link>
    },
    invoices: {
      title: 'Invoices',
      columns: [
        { key: 'invoiceId', label: 'Invoice number' },
        { key: 'quotationId', label: 'Quotation ID', render: (row) => getQuotationNumber(row) },
        { key: 'clientId', label: 'Client', render: (row) => getClientName(row) },
        { key: 'invoiceDate', label: 'Date', render: (row) => formatDate(row.invoiceDate) },
        { key: 'totalAmount', label: 'Amount', render: (row) => currency(row.totalAmount) },
        { key: 'paymentStatus', label: 'Status', badge: true }
      ],
      actions: () => <PdfDownloadButton />
    },
    payments: {
      title: 'Payments Management',
      columns: [
        { key: 'paymentId', label: 'Payment ID' },
        { key: 'invoiceId', label: 'Invoice ID', render: (row) => getInvoiceNumber(row) },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'amount', label: 'Paid Amount', render: (row) => currency(row.amount) },
        { key: 'paymentDate', label: 'Paid Date', render: (row) => formatDate(row.paymentDate) },
        { key: 'status', label: 'Status', badge: true }
      ],
      actions: () => <button className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple">Mark paid</button>
    },
    clients: {
      title: 'Clients Management',
      columns: [
        { key: 'clientId', label: 'Client ID' },
        { key: 'companyName', label: 'Company' },
        { key: 'fullName', label: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'accountStatus', label: 'Status', badge: true }
      ],
      actions: () => <button className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple">Profile</button>
    },
    services: {
      title: 'Services Management',
      columns: [
        { key: 'name', label: 'Service name' },
        { key: 'description', label: 'Description' },
        { key: 'basePrice', label: 'Base price', render: (row) => currency(row.basePrice) },
        { key: 'status', label: 'Status', badge: true }
      ],
      actions: () => <div className="flex gap-2"><button className="rounded-lg p-2 text-purple hover:bg-purple/5"><Edit3 size={16} /></button><button className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button></div>
    },
    users: {
      title: 'Users Management',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (row) => <StatusBadge status={row.role} /> }
      ],
      actions: () => <button className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple">Reset password</button>
    }
  }[type];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Workspace</p>
          <h1 className="text-3xl font-black">{config.title}</h1>
        </div>
        <button className="gradient-button rounded-xl px-4 py-2 text-sm font-bold">Export reports</button>
      </div>
      <SearchFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
      {state.loading && <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">Loading records...</p>}
      {state.error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p>}
      <DataTable columns={config.columns} rows={rows} actions={config.actions} />
      <div className="mt-4 flex justify-end gap-2 text-sm">
        <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Previous</button>
        <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Page 1</button>
        <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Next</button>
      </div>
    </div>
  );
}
