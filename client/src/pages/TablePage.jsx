import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Eye, Trash2, Key, UserPlus } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import SearchFilterBar from '../components/SearchFilterBar.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { downloadPdf } from '../api.js';
import { currency, formatDate, getClientName, getInvoiceNumber, getQuotationNumber, recordId, serviceNames } from '../utils/format.js';

export default function TablePage({ type, role }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState({ loading: true, error: '', data: [] });
  
  const [pinModal, setPinModal] = useState({ open: false, userId: null, pin: '', password: '', error: '' });
  const [addModal, setAddModal] = useState({ open: false, name: '', email: '', password: '', error: '', loading: false });

  const endpoint = {
    quotations: '/quotations',
    invoices: '/invoices',
    payments: '/payments',
    clients: '/clients',
    services: '/services',
    users: '/auth/users'
  }[type];

  const loadData = () => {
    setState({ loading: true, error: '', data: [] });
    api.get(endpoint)
      .then(({ data }) => setState({ loading: false, error: '', data }))
      .catch((err) => setState({ loading: false, error: err.response?.data?.message || 'Unable to load records.', data: [] }));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [endpoint]);

  const data = state.data;
  const rows = useMemo(() => data.filter((row) => {
    const blob = JSON.stringify(row).toLowerCase();
    return blob.includes(search.toLowerCase()) && (!status || row.status === status || row.paymentStatus === status || row.accountStatus === status);
  }), [data, search, status]);

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this accountant?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const viewCredentials = async (e) => {
    e.preventDefault();
    setPinModal(prev => ({ ...prev, error: '', password: '' }));
    try {
      const { data } = await api.post(`/auth/users/${pinModal.userId}/credentials`, { pin: pinModal.pin });
      setPinModal(prev => ({ ...prev, password: data.password }));
    } catch (err) {
      setPinModal(prev => ({ ...prev, error: err.response?.data?.message || 'Invalid PIN' }));
    }
  };

  const addAccountant = async (e) => {
    e.preventDefault();
    setAddModal(prev => ({ ...prev, error: '', loading: true }));
    try {
      await api.post('/auth/register', { 
        name: addModal.name, 
        email: addModal.email, 
        password: addModal.password, 
        role: 'Accountant' 
      });
      setAddModal({ open: false, name: '', email: '', password: '', error: '', loading: false });
      loadData();
    } catch (err) {
      setAddModal(prev => ({ ...prev, error: err.response?.data?.message || 'Failed to add accountant', loading: false }));
    }
  };

  const markPaymentPaid = async (id) => {
    try {
      await api.put(`/payments/${id}`, { status: 'Paid' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const config = {
    quotations: {
      title: role === 'Client' ? 'My Quotations' : role === 'Accountant' ? 'Quotations List' : 'All Quotations',
      columns: [
        { key: 'quotationId', label: 'QT ID' },
        { key: 'client', label: 'Client', render: (row) => getClientName(row) },
        { key: 'projectTitle', label: 'Project' },
        { key: 'servicesSelected', label: 'Services', render: (row) => serviceNames(row) },
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
      actions: (row) => <PdfDownloadButton onClick={() => downloadPdf(recordId(row), row.invoiceId)} />
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
      actions: (row) => (
        <button 
          onClick={() => markPaymentPaid(recordId(row))}
          disabled={row.status === 'Paid'} 
          className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple disabled:opacity-50">
          {row.status === 'Paid' ? 'Paid' : 'Mark paid'}
        </button>
      )
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
      title: 'Users & Accountants',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role', render: (row) => <StatusBadge status={row.role} /> }
      ],
      actions: (row) => {
        if (row.role === 'Accountant') {
          return (
            <div className="flex gap-2">
              <button onClick={() => setPinModal({ open: true, userId: recordId(row), pin: '', password: '', error: '' })} className="flex items-center gap-1 rounded-lg border border-purple px-2 py-1 text-xs font-bold text-purple hover:bg-purple/10"><Key size={14} /> Credentials</button>
              <button onClick={() => deleteUser(recordId(row))} className="flex items-center gap-1 rounded-lg border border-red-500 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
            </div>
          );
        }
        return <span className="text-xs text-slate-400">N/A</span>;
      }
    }
  }[type];

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Workspace</p>
          <h1 className="text-3xl font-black">{config.title}</h1>
        </div>
        <div className="flex gap-3">
          {type === 'users' && (
            <button onClick={() => setAddModal({ ...addModal, open: true })} className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"><UserPlus size={16} /> Add Accountant</button>
          )}
          <button className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-slate-50">Export reports</button>
        </div>
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

      {/* Pin Modal */}
      {pinModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-premium">
            <h2 className="text-xl font-black mb-4">Admin Verification</h2>
            {!pinModal.password ? (
              <form onSubmit={viewCredentials}>
                <p className="text-sm text-slate-500 mb-4">Enter 4-digit secret code to view credentials.</p>
                <input type="password" required maxLength={4} minLength={4} pattern="\d{4}" value={pinModal.pin} onChange={e => setPinModal(p => ({ ...p, pin: e.target.value }))} className="w-full rounded-xl border border-line px-4 py-3 text-center text-xl tracking-widest outline-purple font-mono" placeholder="••••" />
                {pinModal.error && <p className="mt-3 text-sm font-semibold text-red-500">{pinModal.error}</p>}
                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={() => setPinModal({ open: false })} className="flex-1 rounded-xl border border-line py-2 font-bold hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="gradient-button flex-1 rounded-xl py-2 font-bold">View</button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-2">Accountant Password:</p>
                <div className="rounded-xl bg-slate-100 p-4 text-center font-mono text-lg font-bold tracking-wider">{pinModal.password}</div>
                <button onClick={() => setPinModal({ open: false })} className="gradient-button mt-6 w-full rounded-xl py-2 font-bold">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Accountant Modal */}
      {addModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-premium">
            <h2 className="text-xl font-black mb-4">Add Accountant</h2>
            <form onSubmit={addAccountant} className="space-y-4">
              <label className="block text-sm font-bold">Name
                <input required value={addModal.name} onChange={e => setAddModal(p => ({ ...p, name: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple" />
              </label>
              <label className="block text-sm font-bold">Email
                <input type="email" required value={addModal.email} onChange={e => setAddModal(p => ({ ...p, email: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple" />
              </label>
              <label className="block text-sm font-bold">Password
                <input type="password" required minLength={8} value={addModal.password} onChange={e => setAddModal(p => ({ ...p, password: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple" />
              </label>
              {addModal.error && <p className="text-sm font-semibold text-red-500">{addModal.error}</p>}
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setAddModal({ open: false })} className="flex-1 rounded-xl border border-line py-2 font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addModal.loading} className="gradient-button flex-1 rounded-xl py-2 font-bold disabled:opacity-60">{addModal.loading ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
