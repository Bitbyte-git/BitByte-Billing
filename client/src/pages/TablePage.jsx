import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Eye, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import SearchFilterBar from '../components/SearchFilterBar.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency } from '../utils/constants.js';
import { quotationsAPI, invoicesAPI, paymentsAPI, clientsAPI, servicesAPI, usersAPI } from '../api.js';

export default function TablePage({ type, role }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let promise = Promise.resolve([]);
    if (type === 'quotations') promise = quotationsAPI.list();
    if (type === 'invoices') promise = invoicesAPI.list();
    if (type === 'payments') promise = paymentsAPI.list();
    if (type === 'clients') promise = clientsAPI.list();
    if (type === 'services') promise = servicesAPI.list();
    if (type === 'users' && usersAPI.list) promise = usersAPI.list();

    promise.then(res => {
      // Handle standardized response format or plain array
      setData(Array.isArray(res) ? res : (res.data || res.quotations || res.invoices || res.payments || res.clients || res.services || []));
    }).catch(console.error).finally(() => setLoading(false));
  }, [type]);

  const rows = useMemo(() => data.filter((row) => {
    const blob = JSON.stringify(row).toLowerCase();
    const rowStatus = row.status || row.paymentStatus || row.accountStatus;
    return blob.includes(search.toLowerCase()) && (!status || rowStatus === status);
  }), [data, search, status]);

  const config = {
    quotations: {
      title: role === 'Client' ? 'My Quotations' : role === 'Accountant' ? 'Quotations List' : 'All Quotations',
      columns: [
        { key: 'quotationId', label: 'QT ID' },
        { key: 'client', label: 'Client', render: (row) => row.clientId?.companyName || row.clientId?.fullName || 'N/A' },
        { key: 'projectTitle', label: 'Project' },
        { key: 'mainService', label: 'Service', render: (row) => row.mainService || 'N/A' },
        { key: 'subtotal', label: 'Amount', render: (row) => currency(row.subtotal || 0) },
        { key: 'status', label: 'Status', badge: true },
        { key: 'submittedAt', label: 'Submitted On', render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—' }
      ],
      actions: (row) => <Link to={`/${role.toLowerCase()}/quotations/${row._id}`} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple"><Eye size={16} /> View</Link>
    },
    invoices: {
      title: 'Invoices',
      columns: [
        { key: 'invoiceId', label: 'Invoice number' },
        { key: 'quotationId', label: 'Quotation ID', render: (row) => row.quotationId?.quotationId || 'N/A' },
        { key: 'invoiceDate', label: 'Date', render: (row) => new Date(row.invoiceDate).toLocaleDateString() },
        { key: 'totalAmount', label: 'Amount', render: (row) => currency(row.totalAmount || 0) },
        { key: 'paymentStatus', label: 'Status', badge: true }
      ],
      actions: () => <PdfDownloadButton />
    },
    payments: {
      title: 'Payments Management',
      columns: [
        { key: 'paymentId', label: 'Payment ID' },
        { key: 'invoiceId', label: 'Invoice ID' },
        { key: 'paymentMethod', label: 'Method' },
        { key: 'amount', label: 'Paid Amount', render: (row) => currency(row.amount) },
        { key: 'paymentDate', label: 'Paid Date' },
        { key: 'status', label: 'Status', badge: true }
      ],
      actions: () => <button className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple">Mark paid</button>
    },
    clients: {
      title: 'Clients Management',
      columns: [
        { key: 'clientId', label: 'Client ID', render: (row) => row._id.slice(-6) },
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
      {loading ? (
        <div className="py-10 text-center font-semibold text-slate-500">Loading {type}...</div>
      ) : (
        <DataTable columns={config.columns} rows={rows} actions={config.actions} />
      )}
      <div className="mt-4 flex justify-end gap-2 text-sm">
        <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Previous</button>
        <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Page 1</button>
        <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Next</button>
      </div>
    </div>
  );
}
