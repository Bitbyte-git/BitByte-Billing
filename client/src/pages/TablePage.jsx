import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Download, Edit3, Eye, FileText, Key, Plus, ReceiptText, RefreshCw, Save, Trash2, UserPlus, ArrowLeft, Building2, ChevronRight, Hash, Layers, List, Mail, Phone, Users, Calendar } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import EditQuotationModal from '../components/EditQuotationModal.jsx';
import SearchFilterBar from '../components/SearchFilterBar.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { downloadInvoiceForQuotation, downloadPaymentAttachment, downloadPdf, downloadQuotationPdf } from '../api.js';
import { currency, formatDate, getClientName, getInvoiceNumber, getQuotationNumber, recordId, serviceNames } from '../utils/format.js';
import { COUNTRY_CODES, formatPhoneNumber } from '../utils/countryCodes.js';

function buildPaymentDraftFromRow(row) {
  return {
    paymentLabel: row.paymentLabel || 'Payment',
    amount: row.amount ?? 0,
    paymentStatus: row.paymentStatus || row.status || 'Pending',
    paymentMethod: row.paymentMethod || '',
    paymentDate: row.paymentDate ? String(row.paymentDate).slice(0, 10) : '',
    transactionReference: row.transactionReference || '',
    notes: row.notes || '',
    attachmentFileName: row.attachmentFileName || '',
    attachmentMimeType: row.attachmentMimeType || '',
    attachmentData: '',
    hasAttachment: Boolean(row.hasAttachment || row.attachmentFileName)
  };
}

function getInitials(name = '') {
  const clean = String(name || '').replace(/^M\/s\.?\s+|^Mr\.?\s+|^Mrs\.?\s+|^Ms\.?\s+|^Dr\.?\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return 'CL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function TablePage({ type, role }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState({ loading: true, error: '', data: [] });
  const [quotationViewMode, setQuotationViewMode] = useState('customers'); // 'customers' | 'list'
  const [selectedClientKey, setSelectedClientKey] = useState(null);
  
  const [pinModal, setPinModal] = useState({ open: false, userId: null, pin: '', password: '', error: '' });
  const [addModal, setAddModal] = useState({ open: false, name: '', email: '', password: '', error: '', loading: false });
  const [serviceModal, setServiceModal] = useState({ open: false, mode: 'create', id: null, name: '', description: '', basePrice: '', status: 'Active', error: '', loading: false });
  const [clientModal, setClientModal] = useState({
    open: false,
    mode: 'create',
    id: null,
    salutation: 'Mr',
    fullName: '',
    companyName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    alternateCountryCode: '+91',
    alternatePhone: '',
    address: '',
    gstin: '',
    pan: '',
    industry: '',
    accountStatus: 'Active',
    error: '',
    loading: false
  });
  const [serviceSync, setServiceSync] = useState({ loading: false, message: '', error: '' });
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [paymentEdits, setPaymentEdits] = useState({});
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);
  const [sendingWaRow, setSendingWaRow] = useState(null);
  const [waToast, setWaToast] = useState({ show: false, message: '', type: 'success' });

  const triggerWhatsApp = async (row, target) => {
    const id = recordId(row);
    setSendingWaRow({ id, target });
    try {
      const { data } = await api.post(`/quotations/${id}/send-whatsapp`, { target });
      if (data.success) {
        setWaToast({
          show: true,
          type: 'success',
          message: target === 'management'
            ? `Quotation ${row.quotationId} PDF sent to Management WhatsApp (MD, ED, CEO, Office)!`
            : `Quotation ${row.quotationId} PDF sent directly to Client WhatsApp!`
        });
      } else {
        setWaToast({
          show: true,
          type: 'error',
          message: `WhatsApp (${target}): ` + (data.result?.error || data.message || 'Delivery failed')
        });
      }
    } catch (err) {
      setWaToast({
        show: true,
        type: 'error',
        message: `WhatsApp send failed: ` + (err.response?.data?.message || err.message)
      });
    } finally {
      setSendingWaRow(null);
      setTimeout(() => setWaToast({ show: false, message: '', type: 'success' }), 5000);
    }
  };

  const openEditQuotation = async (row) => {
    const id = recordId(row);
    try {
      setLoadingEditId(id);
      const { data: fullQuotation } = await api.get(`/quotations/${id}`);
      setEditingQuotation(fullQuotation || row);
    } catch {
      setEditingQuotation(row);
    } finally {
      setLoadingEditId(null);
    }
  };

  const endpoint = {
    quotations: '/quotations',
    invoices: '/invoices',
    payments: '/payments',
    clients: '/clients',
    services: '/services',
    users: '/auth/users'
  }[type];

  const loadData = async ({ reset = false } = {}) => {
    if (reset) setState({ loading: true, error: '', data: [] });
    else setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const { data } = await api.get(endpoint);
      setState({ loading: false, error: '', data });
      return data;
    } catch (err) {
      setState((prev) => ({
        loading: false,
        error: err.response?.data?.message || 'Unable to load records.',
        data: reset ? [] : prev.data
      }));
      return null;
    }
  };

  useEffect(() => {
    loadData({ reset: true });
  }, [endpoint]);

  useEffect(() => {
    if (type !== 'payments' || role !== 'Admin') return;
    api.get('/invoices')
      .then(({ data }) => setInvoiceOptions(data))
      .catch(() => setInvoiceOptions([]));
  }, [type, role]);

  useEffect(() => {
    setSelectedClientKey(null);
    setQuotationViewMode('customers');
  }, [type]);

  const data = state.data;
  const rows = useMemo(() => data.filter((row) => {
    const blob = JSON.stringify(row).toLowerCase();
    return blob.includes(search.toLowerCase()) && (!status || row.status === status || row.paymentStatus === status || row.accountStatus === status);
  }), [data, search, status]);

  // Group quotations by client for Client-centric Quotations view
  const clientGroups = useMemo(() => {
    if (type !== 'quotations') return [];
    const map = new Map();

    data.forEach((quotation) => {
      const clientObj = (quotation.clientId && typeof quotation.clientId === 'object') ? quotation.clientId : {};
      const clientDetails = (quotation.clientDetails && typeof quotation.clientDetails === 'object') ? quotation.clientDetails : {};

      const rawName = getClientName(quotation);
      const key = clientObj._id
        ? String(clientObj._id)
        : (clientObj.clientId || clientDetails.email || clientObj.email || rawName);

      if (!map.has(key)) {
        map.set(key, {
          key,
          id: clientObj._id || clientObj.clientId || key,
          clientId: clientObj.clientId || (clientObj._id ? String(clientObj._id).slice(-8).toUpperCase() : '-'),
          clientName: rawName,
          companyName: clientObj.companyName || clientDetails.companyName || '',
          email: clientObj.email || clientDetails.email || '',
          phone: clientObj.phone || clientDetails.phone || '',
          countryCode: clientObj.countryCode || clientDetails.countryCode || '+91',
          gstin: clientObj.gstin || clientDetails.gstin || quotation.gstin || '',
          quotations: [],
          totalAmount: 0,
          latestDate: null,
          statuses: []
        });
      }

      const group = map.get(key);
      group.quotations.push(quotation);
      group.totalAmount += Number(quotation.totalAmount || 0);
      if (!group.statuses.includes(quotation.status || 'Draft')) {
        group.statuses.push(quotation.status || 'Draft');
      }

      const qDate = new Date(quotation.submittedAt || quotation.createdAt || Date.now());
      if (!group.latestDate || qDate > new Date(group.latestDate)) {
        group.latestDate = quotation.submittedAt || quotation.createdAt;
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0));
  }, [type, data]);

  const filteredClientGroups = useMemo(() => {
    const query = search.toLowerCase().trim();
    return clientGroups.filter((group) => {
      const matchesSearch = !query ||
        group.clientName.toLowerCase().includes(query) ||
        group.companyName.toLowerCase().includes(query) ||
        group.email.toLowerCase().includes(query) ||
        group.phone.toLowerCase().includes(query) ||
        group.gstin.toLowerCase().includes(query) ||
        group.clientId.toLowerCase().includes(query) ||
        group.quotations.some((q) => (q.quotationId || '').toLowerCase().includes(query) || (q.projectTitle || '').toLowerCase().includes(query));

      const matchesStatus = !status || group.quotations.some((q) => q.status === status);

      return matchesSearch && matchesStatus;
    });
  }, [clientGroups, search, status]);

  const selectedClient = useMemo(() => {
    if (!selectedClientKey) return null;
    return clientGroups.find((g) => g.key === selectedClientKey) || null;
  }, [clientGroups, selectedClientKey]);

  const selectedClientQuotations = useMemo(() => {
    if (!selectedClient) return [];
    return selectedClient.quotations.filter((row) => {
      const blob = JSON.stringify(row).toLowerCase();
      return blob.includes(search.toLowerCase()) && (!status || row.status === status);
    });
  }, [selectedClient, search, status]);
  const entityId = (value) => (typeof value === 'string' ? value : recordId(value));

  useEffect(() => {
    if (type !== 'payments' || role !== 'Admin') return;
    setPaymentEdits((current) => {
      const next = { ...current };
      let changed = false;
      const activeIds = new Set();
      rows.forEach((row) => {
        const id = recordId(row);
        activeIds.add(id);
        if (!next[id]) {
          next[id] = buildPaymentDraftFromRow(row);
          changed = true;
        }
      });
      Object.keys(next).forEach((id) => {
        if (!activeIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [rows, type, role]);

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

  const syncPaymentEditsFromServer = (payments) => {
    const next = {};
    payments.forEach((row) => {
      next[recordId(row)] = buildPaymentDraftFromRow(row);
    });
    setPaymentEdits(next);
  };

  const refreshPayments = async () => {
    const payments = await loadData();
    if (type === 'payments' && role === 'Admin') {
      try {
        const { data } = await api.get('/invoices');
        setInvoiceOptions(data);
      } catch {
        setInvoiceOptions([]);
      }
      if (payments) syncPaymentEditsFromServer(payments);
    }
  };

  const markPaymentPaid = async (row) => {
    try {
      await api.put(`/payments/${recordId(row)}`, { paymentStatus: 'Paid', status: 'Paid' });
      await refreshPayments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const addPaymentStage = async (invoice) => {
    const invoiceId = recordId(invoice);
    const existing = rows.filter((payment) => entityId(payment.invoiceId) === invoiceId);
    try {
      await api.post('/payments', {
        invoiceId,
        paymentLabel: `Payment ${existing.length + 1}`,
        paymentStageOrder: existing.length + 1,
        amount: 0,
        paymentStatus: 'Pending',
        status: 'Pending',
        paymentMethod: 'Pending'
      });
      await refreshPayments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add payment stage');
    }
  };

  const savePaymentStage = async (payment) => {
    const id = recordId(payment);
    const draft = paymentEdits[id];
    if (!draft) return;
    const payload = {
      paymentLabel: draft.paymentLabel,
      amount: Number(draft.amount || 0),
      paymentStatus: draft.paymentStatus,
      status: draft.paymentStatus,
      paymentMethod: draft.paymentMethod,
      paymentDate: draft.paymentDate || undefined,
      transactionReference: draft.transactionReference,
      notes: draft.notes
    };
    if (draft.attachmentData) {
      payload.attachmentFileName = draft.attachmentFileName;
      payload.attachmentMimeType = draft.attachmentMimeType;
      payload.attachmentData = draft.attachmentData;
    } else if (draft.clearAttachment) {
      payload.clearAttachment = true;
    }
    try {
      await api.put(`/payments/${id}`, payload);
      await refreshPayments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save payment stage');
    }
  };

  const deletePaymentStage = async (payment) => {
    if (!window.confirm('Delete this payment stage?')) return;
    try {
      await api.delete(`/payments/${recordId(payment)}`);
      await refreshPayments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete payment stage');
    }
  };

  const deleteQuotation = async (row) => {
    const id = recordId(row);
    const label = row.quotationId || 'this quotation';
    if (!window.confirm(`Are you sure you want to delete quotation ${label}? This will permanently remove it along with any linked invoice and payments.`)) return;
    try {
      await api.delete(`/quotations/${id}`);
      setWaToast({
        show: true,
        type: 'success',
        message: `Quotation ${label} deleted successfully!`
      });
      loadData();
    } catch (err) {
      setWaToast({
        show: true,
        type: 'error',
        message: 'Failed to delete quotation: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setTimeout(() => setWaToast({ show: false, message: '', type: 'success' }), 5000);
    }
  };

  const deleteInvoice = async (row) => {
    const id = recordId(row);
    const label = row.invoiceId || 'this invoice';
    if (!window.confirm(`Are you sure you want to delete invoice ${label}? This will remove associated payment stages and reset quotation status.`)) return;
    try {
      await api.delete(`/invoices/${id}`);
      setWaToast({
        show: true,
        type: 'success',
        message: `Invoice ${label} deleted successfully!`
      });
      loadData();
    } catch (err) {
      setWaToast({
        show: true,
        type: 'error',
        message: 'Failed to delete invoice: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setTimeout(() => setWaToast({ show: false, message: '', type: 'success' }), 5000);
    }
  };

  const deleteClient = async (row) => {
    const id = recordId(row);
    const label = getClientName(row) || row.clientId || 'this client';
    if (!window.confirm(`Are you sure you want to delete client "${label}"? This will also remove any quotations and invoices for this client.`)) return;
    try {
      await api.delete(`/clients/${id}`);
      setWaToast({
        show: true,
        type: 'success',
        message: `Client "${label}" deleted successfully!`
      });
      loadData();
    } catch (err) {
      setWaToast({
        show: true,
        type: 'error',
        message: 'Failed to delete client: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setTimeout(() => setWaToast({ show: false, message: '', type: 'success' }), 5000);
    }
  };

  const deleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete service');
    }
  };

  const openEditService = (row) => {
    setServiceModal({
      open: true,
      mode: 'edit',
      id: recordId(row),
      name: row.name || '',
      description: row.description || '',
      basePrice: row.basePrice || '',
      status: row.status || 'Active',
      error: '',
      loading: false
    });
  };

  const saveService = async (e) => {
    e.preventDefault();
    setServiceModal(prev => ({ ...prev, error: '', loading: true }));
    try {
      const payload = {
        name: serviceModal.name,
        description: serviceModal.description,
        basePrice: Number(serviceModal.basePrice),
        status: serviceModal.status
      };
      if (serviceModal.mode === 'create') {
        await api.post('/services', payload);
      } else {
        await api.put(`/services/${serviceModal.id}`, payload);
      }
      setServiceModal(prev => ({ ...prev, open: false, loading: false }));
      loadData();
    } catch (err) {
      setServiceModal(prev => ({ ...prev, error: err.response?.data?.message || 'Failed to save service', loading: false }));
    }
  };

  const openEditClient = (row) => {
    setClientModal({
      open: true,
      mode: 'edit',
      id: recordId(row),
      salutation: row.salutation || 'Mr',
      fullName: row.fullName || '',
      companyName: row.companyName || '',
      email: row.email || '',
      countryCode: row.countryCode || '+91',
      phone: row.phone || '',
      alternateCountryCode: row.alternateCountryCode || '+91',
      alternatePhone: row.alternatePhone || '',
      address: row.address || '',
      gstin: row.gstin || '',
      pan: row.pan || '',
      industry: row.industry || '',
      accountStatus: row.accountStatus || 'Active',
      error: '',
      loading: false
    });
  };

  const saveClient = async (e) => {
    e.preventDefault();
    setClientModal(prev => ({ ...prev, error: '', loading: true }));
    try {
      const payload = {
        salutation: clientModal.salutation || 'Mr',
        fullName: clientModal.fullName,
        companyName: clientModal.companyName,
        email: clientModal.email,
        countryCode: clientModal.countryCode || '+91',
        phone: clientModal.phone,
        alternateCountryCode: clientModal.alternateCountryCode || '+91',
        alternatePhone: clientModal.alternatePhone || undefined,
        address: clientModal.address || undefined,
        gstin: clientModal.gstin || undefined,
        pan: clientModal.pan || undefined,
        industry: clientModal.industry || undefined,
        accountStatus: clientModal.accountStatus
      };
      if (clientModal.mode === 'create') {
        await api.post('/clients', payload);
      } else {
        await api.put(`/clients/${clientModal.id}`, payload);
      }
      setClientModal(prev => ({ ...prev, open: false, loading: false }));
      loadData();
    } catch (err) {
      setClientModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to save client details.'
      }));
    }
  };

  const syncServicePrices = async () => {
    setServiceSync({ loading: true, message: '', error: '' });
    try {
      const { data } = await api.post('/services/sync-google-sheet');
      const summary = data.summary || {};
      setServiceSync({
        loading: false,
        message: `Synced ${summary.totalRows || 0} rows. Created ${summary.created || 0}, updated ${summary.updated || 0}, skipped ${summary.skipped || 0}.`,
        error: summary.errors?.length ? summary.errors.slice(0, 3).join(' ') : ''
      });
      await loadData();
    } catch (err) {
      setServiceSync({
        loading: false,
        message: '',
        error: err.response?.data?.message || 'Unable to sync service prices.'
      });
    }
  };

  if (type === 'payments' && role === 'Admin') {
    const filteredInvoices = invoiceOptions.filter((invoice) => {
      const invoiceBlob = JSON.stringify(invoice).toLowerCase();
      const invoicePayments = rows.filter((payment) => entityId(payment.invoiceId) === recordId(invoice));
      return invoiceBlob.includes(search.toLowerCase()) || invoicePayments.length > 0;
    });

    return (
      <div>
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workspace</p>
            <h1 className="text-3xl font-black">Advanced Payment Tracking</h1>
          </div>
        </div>
        <SearchFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
        {state.loading && !rows.length && <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">Loading payment stages...</p>}
        {state.error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p>}
        <div className="space-y-5">
          {filteredInvoices.map((invoice) => {
            const invoiceId = recordId(invoice);
            const paymentRows = rows
              .filter((payment) => entityId(payment.invoiceId) === invoiceId)
              .sort((a, b) => Number(a.paymentStageOrder || 0) - Number(b.paymentStageOrder || 0));
            const total = Number(invoice.totalAmount || invoice.finalTotal || 0);
            const paid = paymentRows
              .filter((payment) => ['Paid', 'Partial'].includes(payment.paymentStatus || payment.status))
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const remaining = Math.max(total - paid, 0);
            const progress = total ? Math.min((paid / total) * 100, 100) : 0;

            return (
              <section key={invoiceId} className="overflow-hidden rounded-2xl border border-line bg-white shadow-premium">
                <div className="border-b border-line bg-slate-50 p-5">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Invoice {invoice.invoiceId}</p>
                      <h2 className="text-xl font-black">{getClientName(invoice)}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{getQuotationNumber(invoice)} · Due {formatDate(invoice.dueDate)} · Quotation status: <StatusBadge status={invoice.quotationId?.status || 'Invoice Generated'} /></p>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-4 lg:min-w-[520px]">
                      <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Total</p><strong>{currency(total)}</strong></div>
                      <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Paid</p><strong className="text-emerald-600">{currency(paid)}</strong></div>
                      <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Balance</p><strong className="text-red-600">{currency(remaining)}</strong></div>
                      <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Status</p><StatusBadge status={remaining === 0 ? 'Paid' : paid > 0 ? 'Partial' : invoice.paymentStatus} /></div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple to-violet transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">{Math.round(progress)}% payment completed</p>
                </div>

                <div className="space-y-3 p-5">
                  {paymentRows.map((payment, index) => {
                    const id = recordId(payment);
                    const draft = paymentEdits[id] || {};
                    const updateDraft = (key, value) => setPaymentEdits((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
                    return (
                      <div key={id} className="rounded-2xl border border-line p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-purple/10 text-sm font-black text-purple">{index + 1}</span>
                            <StatusBadge status={draft.paymentStatus || payment.paymentStatus || payment.status} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => savePaymentStage(payment)} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple"><Save size={15} /> Save</button>
                            <button onClick={() => markPaymentPaid(payment)} disabled={(draft.paymentStatus || payment.paymentStatus || payment.status) === 'Paid'} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50"><CheckCircle2 size={15} /> Mark Paid</button>
                            <button onClick={() => deletePaymentStage(payment)} className="rounded-xl border border-red-100 px-3 py-2 text-red-500"><Trash2 size={15} /></button>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                          <label className="text-xs font-bold uppercase text-slate-400">Payment Label
                            <input value={draft.paymentLabel || ''} onChange={(event) => updateDraft('paymentLabel', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple" />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400">Amount
                            <input type="number" min={0} value={draft.amount ?? ''} onChange={(event) => updateDraft('amount', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple" />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400">Payment Status
                            <select value={draft.paymentStatus || 'Pending'} onChange={(event) => updateDraft('paymentStatus', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple">
                              <option>Pending</option>
                              <option>Paid</option>
                              <option>Failed</option>
                              <option>Partial</option>
                            </select>
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400">Payment Method
                            <input value={draft.paymentMethod || ''} onChange={(event) => updateDraft('paymentMethod', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple" placeholder="UPI / Bank / Cash" />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400">Paid Date
                            <input type="date" value={draft.paymentDate || ''} onChange={(event) => updateDraft('paymentDate', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple" />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400">Transaction Reference
                            <input value={draft.transactionReference || ''} onChange={(event) => updateDraft('transactionReference', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple" />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400 md:col-span-2">Notes
                            <input value={draft.notes || ''} onChange={(event) => updateDraft('notes', event.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple" />
                          </label>
                          <label className="text-xs font-bold uppercase text-slate-400 md:col-span-2">Payment Attachment <span className="normal-case text-slate-300">(optional)</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.webp"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('Attachment must be 2MB or smaller.');
                                  event.target.value = '';
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  updateDraft('attachmentData', reader.result);
                                  updateDraft('attachmentFileName', file.name);
                                  updateDraft('attachmentMimeType', file.type || 'application/octet-stream');
                                  updateDraft('hasAttachment', true);
                                  updateDraft('clearAttachment', false);
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-purple"
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {(draft.hasAttachment || payment.hasAttachment || payment.attachmentFileName) && (
                                <button type="button" onClick={() => downloadPaymentAttachment(id, draft.attachmentFileName || payment.attachmentFileName || 'payment-attachment')} className="rounded-lg border border-purple/30 px-3 py-1 text-xs font-bold text-purple">
                                  Download attachment
                                </button>
                              )}
                              {(draft.hasAttachment || payment.hasAttachment || payment.attachmentFileName) && (
                                <button type="button" onClick={() => { updateDraft('attachmentData', ''); updateDraft('attachmentFileName', ''); updateDraft('attachmentMimeType', ''); updateDraft('hasAttachment', false); updateDraft('clearAttachment', true); }} className="rounded-lg border border-red-100 px-3 py-1 text-xs font-bold text-red-600">
                                  Remove attachment
                                </button>
                              )}
                              {draft.attachmentFileName && <span className="text-xs font-semibold text-slate-500">{draft.attachmentFileName}</span>}
                            </div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                  {!paymentRows.length && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No payment stages added for this invoice yet.</p>}
                  <button onClick={() => addPaymentStage(invoice)} className="inline-flex items-center gap-2 rounded-xl border border-purple/30 bg-purple/5 px-4 py-3 text-sm font-black text-purple"><Plus size={16} /> Add Payment</button>
                </div>
              </section>
            );
          })}
          {!filteredInvoices.length && !state.loading && <p className="rounded-2xl border border-line bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">No invoices available for staged payment tracking.</p>}
        </div>
      </div>
    );
  }

  const config = {
    quotations: {
      title: role === 'Client' ? 'My Quotations' : role === 'Accountant' ? 'Quotations List' : 'All Quotations',
      columns: [
        {
          key: 'quotationId',
          label: 'QT ID',
          nowrap: true,
          render: (row) => (
            <span className="inline-block font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-1 rounded-md tracking-tight whitespace-nowrap shadow-2xs">
              {row.quotationId}
            </span>
          )
        },
        {
          key: 'client',
          label: 'Client',
          nowrap: true,
          render: (row) => (
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {getClientName(row)}
            </span>
          )
        },
        {
          key: 'projectTitle',
          label: 'Project',
          render: (row) => (
            <div className="max-w-[190px]" title={row.projectTitle}>
              <p className="font-semibold text-slate-800 text-xs truncate">{row.projectTitle}</p>
            </div>
          )
        },
        {
          key: 'servicesSelected',
          label: 'Services',
          render: (row) => {
            const allServices = serviceNames(row);
            const list = allServices.split(', ').filter(Boolean);
            if (!list.length) return <span className="text-slate-400 text-xs">-</span>;
            return (
              <div className="max-w-[240px] flex items-center gap-1.5" title={allServices}>
                <span className="font-medium text-xs text-slate-700 truncate max-w-[150px]">
                  {list[0]}
                </span>
                {list.length > 1 && (
                  <span className="inline-flex items-center rounded-full bg-purple/10 px-2 py-0.5 text-[10px] font-bold text-purple whitespace-nowrap">
                    +{list.length - 1} more
                  </span>
                )}
              </div>
            );
          }
        },
        {
          key: 'totalAmount',
          label: 'Amount',
          nowrap: true,
          render: (row) => (
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {currency(row.totalAmount)}
            </span>
          )
        },
        {
          key: 'status',
          label: 'Status',
          nowrap: true,
          badge: true
        },
        {
          key: 'submittedAt',
          label: 'Submitted On',
          nowrap: true,
          render: (row) => (
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              {formatDate(row.submittedAt || row.createdAt)}
            </span>
          )
        }
      ],
      actions: (row) => {
        if (role === 'Client') {
          return (
            <div className="flex items-center justify-end">
              <Link
                to={`/client/quotations/${recordId(row)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-purple hover:bg-purple/5 transition shadow-2xs"
              >
                <Eye size={13} /> View
              </Link>
            </div>
          );
        }

        const hasInvoice = Boolean(row.invoice || ['Invoice Generated', 'Paid'].includes(row.status));
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Link
              to={`/${role.toLowerCase()}/quotations/${recordId(row)}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
              title="View quotation details"
            >
              <Eye size={13} className="text-slate-500" /> View
            </Link>
            {['Admin', 'Accountant'].includes(role) && (() => {
              const editCount = row.adminEditCount || 0;
              const editsLeft = 2 - editCount;
              const canEdit = editsLeft > 0;
              return (
                <button
                  type="button"
                  onClick={() => openEditQuotation(row)}
                  disabled={!canEdit || loadingEditId === recordId(row)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition shadow-2xs ${
                    canEdit
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white hover:border-amber-600'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                  title={canEdit ? `Edit quotation (${editsLeft} edit${editsLeft !== 1 ? 's' : ''} left)` : 'Maximum edits used (2/2)'}
                >
                  <Edit3 size={13} />
                  <span>{loadingEditId === recordId(row) ? 'Loading...' : 'Edit'}</span>
                  {canEdit && (
                    <span className="rounded-full bg-amber-200/70 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
                      {editsLeft}
                    </span>
                  )}
                </button>
              );
            })()}
            {['Admin', 'Accountant'].includes(role) && (
              <div className="inline-flex items-center shadow-2xs rounded-lg overflow-hidden border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => triggerWhatsApp(row, 'management')}
                  disabled={sendingWaRow?.id === recordId(row)}
                  className="inline-flex items-center gap-1 bg-purple/5 px-2.5 py-1.5 text-xs font-bold text-purple hover:bg-purple hover:text-white transition disabled:opacity-50"
                  title="Send quotation PDF to Management WhatsApp (MD, ED, CEO, Bit Byte Office)"
                >
                  <MessageCircle size={13} />
                  <span>{sendingWaRow?.id === recordId(row) && sendingWaRow?.target === 'management' ? 'Sending...' : 'Mgmt WA'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerWhatsApp(row, 'client')}
                  disabled={sendingWaRow?.id === recordId(row)}
                  className="inline-flex items-center gap-1 border-l border-slate-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                  title={`Send quotation PDF directly to Client WhatsApp (${row.clientId?.phone || 'client'})`}
                >
                  <MessageCircle size={13} />
                  <span>{sendingWaRow?.id === recordId(row) && sendingWaRow?.target === 'client' ? 'Sending...' : 'Client WA'}</span>
                </button>
              </div>
            )}
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-purple/30 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => downloadQuotationPdf(recordId(row), row.quotationId || 'Quotation', 'Advanced')}
                className="inline-flex items-center gap-1 bg-purple/5 px-2.5 py-1.5 text-xs font-bold text-purple hover:bg-purple hover:text-white transition"
                title="Download Quotation in Modern Advanced Template"
              >
                <Download size={13} />
                <span>Advance</span>
              </button>
              <button
                type="button"
                onClick={() => downloadQuotationPdf(recordId(row), row.quotationId || 'Quotation', 'Legacy')}
                className="inline-flex items-center gap-1 border-l border-purple/20 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
                title="Download Quotation in Classic Legacy MNC Proposal Template"
              >
                <Download size={13} />
                <span>Legacy</span>
              </button>
            </div>
            {hasInvoice ? (
              <button
                type="button"
                onClick={() => {
                  if (row.invoice?._id) {
                    downloadPdf(recordId(row.invoice), row.invoice.invoiceId || 'Invoice');
                  } else {
                    downloadInvoiceForQuotation(recordId(row), row.quotationId);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition shadow-2xs"
                title="Download Invoice PDF"
              >
                <ReceiptText size={13} /> Invoice
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed opacity-50"
                title="Invoice not generated yet"
              >
                <ReceiptText size={13} /> Invoice
              </button>
            )}
            {['Admin', 'Accountant'].includes(role) && (
              <button
                type="button"
                onClick={() => deleteQuotation(row)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition shadow-2xs"
                title={`Delete quotation ${row.quotationId}`}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}
          </div>
        );
      }
    },
    invoices: {
      title: 'Invoices',
      columns: [
        {
          key: 'invoiceId',
          label: 'Invoice #',
          nowrap: true,
          render: (row) => (
            <span className="inline-block font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-1 rounded-md tracking-tight whitespace-nowrap shadow-2xs">
              {row.invoiceId}
            </span>
          )
        },
        {
          key: 'quotationId',
          label: 'QT ID',
          nowrap: true,
          render: (row) => (
            <span className="font-mono text-xs text-slate-600 whitespace-nowrap font-semibold">
              {getQuotationNumber(row)}
            </span>
          )
        },
        ...(role !== 'Client' ? [{
          key: 'clientId',
          label: 'Client',
          nowrap: true,
          render: (row) => (
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {getClientName(row)}
            </span>
          )
        }] : []),
        {
          key: 'invoiceDate',
          label: 'Date',
          nowrap: true,
          render: (row) => (
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              {formatDate(row.invoiceDate)}
            </span>
          )
        },
        {
          key: 'totalAmount',
          label: 'Total',
          nowrap: true,
          render: (row) => (
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {currency(row.totalAmount)}
            </span>
          )
        },
        {
          key: 'amountPaid',
          label: 'Paid',
          nowrap: true,
          render: (row) => (
            <span className="font-bold text-emerald-600 whitespace-nowrap">
              {currency(row.amountPaid || 0)}
            </span>
          )
        },
        {
          key: 'balanceDue',
          label: 'Balance',
          nowrap: true,
          render: (row) => (
            <span className="font-bold text-red-600 whitespace-nowrap">
              {currency(row.balanceDue ?? Math.max(Number(row.totalAmount || 0) - Number(row.amountPaid || 0), 0))}
            </span>
          )
        },
        {
          key: 'paymentStatus',
          label: 'Status',
          nowrap: true,
          badge: true
        },
        {
          key: 'emailDeliveryStatus',
          label: 'Email',
          nowrap: true,
          render: (row) => (
            <span className={`text-xs font-bold whitespace-nowrap ${row.emailDeliveryStatus === 'Sent' ? 'text-emerald-600' : 'text-slate-500'}`}>
              {row.emailDeliveryStatus === 'Sent' ? 'Sent' : row.emailDeliveryStatus || 'Pending'}
            </span>
          )
        }
      ],
      actions: (row) => {
        if (role === 'Client') {
          return (
            <div className="flex items-center justify-end">
              <Link to={`/public/client-invoice/${recordId(row)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-2xs">
                <Eye size={13} /> View / Pay
              </Link>
            </div>
          );
        }

        const linkedQuotationId = row.quotationId ? recordId(row.quotationId) : null;
        const quotationNum = getQuotationNumber(row);
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => downloadPdf(recordId(row), row.invoiceId)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-purple hover:bg-purple hover:text-white transition shadow-2xs"
              title="Download Invoice PDF"
            >
              <Download size={13} />
              <span>Invoice</span>
            </button>
            {linkedQuotationId && (
              <div className="inline-flex items-center overflow-hidden rounded-lg border border-purple/30 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => downloadQuotationPdf(linkedQuotationId, quotationNum || 'Quotation', 'Advanced')}
                  className="inline-flex items-center gap-1 bg-purple/5 px-2 py-1.5 text-xs font-bold text-purple hover:bg-purple hover:text-white transition"
                  title="Download linked Quotation in Modern Advanced Template"
                >
                  <Download size={12} />
                  <span>Advance</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadQuotationPdf(linkedQuotationId, quotationNum || 'Quotation', 'Legacy')}
                  className="inline-flex items-center gap-1 border-l border-purple/20 bg-indigo-50/70 px-2 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
                  title="Download linked Quotation in Classic Legacy MNC Proposal Template"
                >
                  <Download size={12} />
                  <span>Legacy</span>
                </button>
              </div>
            )}
            {['Admin', 'Accountant'].includes(role) && (
              <button
                type="button"
                onClick={() => deleteInvoice(row)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition shadow-2xs"
                title={`Delete invoice ${row.invoiceId}`}
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            )}
          </div>
        );
      }
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
          onClick={() => markPaymentPaid(row)}
          disabled={row.status === 'Paid'} 
          className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple disabled:opacity-50"
        >
          {row.status === 'Paid' ? 'Paid' : 'Mark paid'}
        </button>
      )
    },
    clients: {
      title: 'Clients Management',
      columns: [
        { key: 'clientId', label: 'Client ID' },
        { key: 'companyName', label: 'Company' },
        { key: 'fullName', label: 'Contact Name', render: (row) => getClientName(row) },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone', render: (row) => formatPhoneNumber(row.phone, row.countryCode) },
        { key: 'accountStatus', label: 'Status', badge: true }
      ],
      actions: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditClient(row)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-purple hover:bg-purple/5 shadow-2xs transition"
          >
            <Edit3 size={13} /> Edit Details
          </button>
          {['Admin', 'Accountant'].includes(role) && (
            <button
              type="button"
              onClick={() => deleteClient(row)}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white transition shadow-2xs"
              title={`Delete client ${getClientName(row)}`}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      )
    },
    services: {
      title: 'Services Management',
      columns: [
        { key: 'name', label: 'Service name' },
        { key: 'description', label: 'Description' },
        { key: 'basePrice', label: 'Base price', render: (row) => currency(row.basePrice) },
        { key: 'status', label: 'Status', badge: true }
      ],
      actions: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openEditService(row)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-purple hover:bg-purple/5 shadow-2xs">
            <Edit3 size={15} />
          </button>
          <button onClick={() => deleteService(recordId(row))} className="rounded-lg border border-slate-200 bg-white p-1.5 text-red-500 hover:bg-red-50 shadow-2xs">
            <Trash2 size={15} />
          </button>
        </div>
      )
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
            <div className="flex items-center justify-end gap-1.5">
              <button onClick={() => setPinModal({ open: true, userId: recordId(row), pin: '', password: '', error: '' })} className="flex items-center gap-1 rounded-lg border border-purple/30 bg-purple/5 px-2.5 py-1.5 text-xs font-bold text-purple hover:bg-purple hover:text-white transition shadow-2xs"><Key size={13} /> Credentials</button>
              <button onClick={() => deleteUser(recordId(row))} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition shadow-2xs"><Trash2 size={13} /> Delete</button>
            </div>
          );
        }
        return <span className="text-xs text-slate-400">N/A</span>;
      }
    }
  }[type];

  return (
    <div>
      {waToast.show && (
        <div className={`mb-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold border shadow-sm ${
          waToast.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <MessageCircle size={16} />
            <span>{waToast.message}</span>
          </div>
          <button onClick={() => setWaToast({ show: false, message: '', type: 'success' })} className="text-slate-400 hover:text-slate-600 font-bold px-1">
            ✕
          </button>
        </div>
      )}
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Workspace</p>
          <h1 className="text-3xl font-black">
            {type === 'quotations' && selectedClient ? (
              <span className="flex items-center gap-2">
                <span className="text-slate-400 font-medium text-2xl">Quotations /</span>
                <span>{selectedClient.clientName}</span>
              </span>
            ) : config.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {type === 'quotations' && role !== 'Client' && !selectedClient && (
            <div className="flex items-center rounded-xl border border-line bg-slate-100 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuotationViewMode('customers')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  quotationViewMode === 'customers' ? 'bg-white text-purple shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} /> By Customer ({clientGroups.length})
              </button>
              <button
                type="button"
                onClick={() => setQuotationViewMode('list')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  quotationViewMode === 'list' ? 'bg-white text-purple shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List size={14} /> All Quotations ({data.length})
              </button>
            </div>
          )}

          {type === 'clients' && (
            <button
              onClick={() => setClientModal({ open: true, mode: 'create', id: null, fullName: '', companyName: '', email: '', countryCode: '+91', phone: '', alternateCountryCode: '+91', alternatePhone: '', address: '', gstin: '', pan: '', industry: '', accountStatus: 'Active', error: '', loading: false })}
              className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-glow"
            >
              <UserPlus size={16} /> Add Client
            </button>
          )}
          {type === 'users' && (
            <button onClick={() => setAddModal({ ...addModal, open: true })} className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"><UserPlus size={16} /> Add Accountant</button>
          )}
          {type === 'services' && (
            <>
              <button onClick={syncServicePrices} disabled={serviceSync.loading} className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={16} className={serviceSync.loading ? 'animate-spin' : ''} /> {serviceSync.loading ? 'Syncing...' : 'Sync Prices'}</button>
              <button onClick={() => setServiceModal({ open: true, mode: 'create', id: null, name: '', description: '', basePrice: '', status: 'Active', error: '', loading: false })} className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"><Plus size={16} /> Add Service</button>
            </>
          )}
          {!(role === 'Client' && type === 'invoices') && <button className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-slate-50">Export reports</button>}
        </div>
      </div>

      {/* ── Quotations: Grouped By Customer View ── */}
      {type === 'quotations' && role !== 'Client' && quotationViewMode === 'customers' && !selectedClient ? (
        <div>
          <SearchFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
          {state.loading && !clientGroups.length && (
            <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
              Loading customer quotations...
            </p>
          )}
          {state.error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p>}

          <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>SHOWING {filteredClientGroups.length} OF {clientGroups.length} CLIENTS</span>
            <span>Click any customer to view their quotations</span>
          </div>

          {!filteredClientGroups.length && !state.loading && (
            <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-premium">
              <Users size={36} className="mx-auto mb-3 text-slate-300" />
              <h3 className="text-base font-black text-slate-800">No Customers Found</h3>
              <p className="mt-1 text-xs text-slate-500 font-semibold">
                {search || status ? 'No clients match your search or filter criteria.' : 'No quotations have been generated yet.'}
              </p>
            </div>
          )}

          {filteredClientGroups.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-premium">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 pl-6 pr-4">Customer</th>
                      <th className="py-3.5 px-4">Contact Details</th>
                      <th className="py-3.5 px-4">GSTIN</th>
                      <th className="py-3.5 px-4 text-center">Quotations</th>
                      <th className="py-3.5 px-4 text-right">Total Value</th>
                      <th className="py-3.5 pl-4 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredClientGroups.map((group) => {
                      const initials = getInitials(group.clientName);
                      return (
                        <tr
                          key={group.key}
                          onClick={() => setSelectedClientKey(group.key)}
                          className="group hover:bg-purple/5 transition-colors cursor-pointer"
                        >
                          <td className="py-4 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple/10 font-black text-xs text-purple group-hover:bg-purple group-hover:text-white transition-colors">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 group-hover:text-purple transition-colors">
                                  {group.clientName}
                                </p>
                                {group.companyName && group.companyName !== group.clientName ? (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Building2 size={12} className="text-slate-400 shrink-0" />
                                    <span>{group.companyName}</span>
                                  </p>
                                ) : (
                                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">ID: {group.clientId}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs">
                            {group.phone && group.phone !== '-' ? (
                              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-400 shrink-0" />
                                <span>{formatPhoneNumber(group.phone, group.countryCode)}</span>
                              </p>
                            ) : null}
                            {group.email && group.email !== '-' ? (
                              <p className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Mail size={12} className="text-slate-400 shrink-0" />
                                <span>{group.email}</span>
                              </p>
                            ) : null}
                          </td>
                          <td className="py-4 px-4">
                            {group.gstin ? (
                              <span className="inline-block rounded-md bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 font-mono text-xs font-bold text-emerald-800">
                                {group.gstin}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 group-hover:bg-purple/10 group-hover:text-purple px-3 py-1 text-xs font-bold text-slate-700 transition-colors">
                              <FileText size={12} />
                              {group.quotations.length} {group.quotations.length === 1 ? 'Quotation' : 'Quotations'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-black text-slate-900 text-sm">
                              {currency(group.totalAmount)}
                            </span>
                          </td>
                          <td className="py-4 pl-4 pr-6 text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple/20 bg-white group-hover:bg-purple group-hover:text-white px-3 py-1.5 text-xs font-bold text-purple shadow-2xs transition">
                              View Quotations <ChevronRight size={13} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : type === 'quotations' && role !== 'Client' && selectedClient ? (
        /* ── Quotations: Specific Customer Drill-Down View ── */
        <div>
          <div className="mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-line bg-white p-5 shadow-premium">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedClientKey(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-slate-50 text-slate-600 hover:bg-purple hover:text-white hover:border-purple transition shadow-2xs"
                  title="Back to Customers List"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{selectedClient.clientName}</h2>
                    {selectedClient.clientId && selectedClient.clientId !== '-' && (
                      <span className="rounded-md bg-slate-100 border border-slate-200/80 px-2 py-0.5 font-mono text-xs font-bold text-slate-600">
                        {selectedClient.clientId}
                      </span>
                    )}
                    {selectedClient.gstin && (
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                        GSTIN: {selectedClient.gstin}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    {selectedClient.companyName && selectedClient.companyName !== selectedClient.clientName && (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        {selectedClient.companyName}
                      </span>
                    )}
                    {selectedClient.phone && selectedClient.phone !== '-' && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        {formatPhoneNumber(selectedClient.phone, selectedClient.countryCode)}
                      </span>
                    )}
                    {selectedClient.email && selectedClient.email !== '-' && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        {selectedClient.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
                <div className="rounded-xl bg-slate-50 border border-line px-4 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quotations</p>
                  <p className="text-sm font-black text-purple">{selectedClient.quotations.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-line px-4 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Value</p>
                  <p className="text-sm font-black text-slate-900">{currency(selectedClient.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <SearchFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
          <DataTable columns={config.columns} rows={selectedClientQuotations} actions={config.actions} />
        </div>
      ) : (
        /* ── Standard Flat Table View ── */
        <div>
          <SearchFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} />
          {type === 'services' && serviceSync.message && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{serviceSync.message}</p>}
          {type === 'services' && serviceSync.error && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{serviceSync.error}</p>}
          {state.loading && !rows.length && <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">Loading records...</p>}
          {state.error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{state.error}</p>}
          <DataTable columns={config.columns} rows={rows} actions={config.actions} />
          
          <div className="mt-4 flex justify-end gap-2 text-sm">
            <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Previous</button>
            <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Page 1</button>
            <button className="rounded-xl border border-line bg-white px-4 py-2 font-bold">Next</button>
          </div>
        </div>
      )}

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

      {/* Service Modal (Create/Edit) */}
      {serviceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-premium">
            <h2 className="text-xl font-black mb-4">{serviceModal.mode === 'create' ? 'Add Service' : 'Edit Service'}</h2>
            <form onSubmit={saveService} className="space-y-4">
              <label className="block text-sm font-bold">Service Name
                <input required value={serviceModal.name} onChange={e => setServiceModal(p => ({ ...p, name: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple font-medium" />
              </label>
              <label className="block text-sm font-bold">Description
                <textarea required value={serviceModal.description} onChange={e => setServiceModal(p => ({ ...p, description: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple font-medium min-h-20" />
              </label>
              <label className="block text-sm font-bold">Base Price (₹)
                <input type="number" required min={0} step="any" value={serviceModal.basePrice} onChange={e => setServiceModal(p => ({ ...p, basePrice: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple font-medium" />
              </label>
              <label className="block text-sm font-bold">Status
                <select value={serviceModal.status} onChange={e => setServiceModal(p => ({ ...p, status: e.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-2 outline-purple bg-white font-medium">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              {serviceModal.error && <p className="text-sm font-semibold text-red-500">{serviceModal.error}</p>}
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setServiceModal(p => ({ ...p, open: false }))} className="flex-1 rounded-xl border border-line py-2 font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={serviceModal.loading} className="gradient-button flex-1 rounded-xl py-2 font-bold disabled:opacity-60">{serviceModal.loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Quotation Modal */}
      {editingQuotation && (
        <EditQuotationModal
          quotation={editingQuotation}
          onClose={() => setEditingQuotation(null)}
          onSaved={(updated) => {
            setEditingQuotation(null);
            loadData();
          }}
        />
      )}

      {/* Client Modal (Create/Edit) */}
      {clientModal.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy/50 backdrop-blur-sm p-4 pt-6 md:pt-10 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-premium mb-8">
            <h2 className="text-xl font-black mb-4 text-slate-900">{clientModal.mode === 'create' ? 'Add New Client' : 'Edit Client Details'}</h2>
            <form onSubmit={saveClient} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase text-slate-500">Salutation *
                <select value={clientModal.salutation || 'Mr'} onChange={e => setClientModal(p => ({ ...p, salutation: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple bg-white">
                  <option value="Mr">Mr.</option>
                  <option value="Ms">Ms.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Dr">Dr.</option>
                  <option value="Prof">Prof.</option>
                  <option value="M/s">M/s</option>
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500">Full Name *
                <input required value={clientModal.fullName} onChange={e => setClientModal(p => ({ ...p, fullName: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="John Doe" />
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500 sm:col-span-2">Company Name
                <input value={clientModal.companyName} onChange={e => setClientModal(p => ({ ...p, companyName: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="Bit Byte Tech" />
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500">Email *
                <input type="email" required value={clientModal.email} onChange={e => setClientModal(p => ({ ...p, email: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="client@gmail.com" />
              </label>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Phone *</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={clientModal.countryCode || '+91'}
                    onChange={e => setClientModal(p => ({ ...p, countryCode: e.target.value }))}
                    className="w-28 rounded-xl border border-line bg-white px-2 py-2 text-xs font-bold outline-purple"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    value={clientModal.phone}
                    onChange={e => setClientModal(p => ({ ...p, phone: e.target.value }))}
                    className="flex-1 rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Alternate Phone</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={clientModal.alternateCountryCode || '+91'}
                    onChange={e => setClientModal(p => ({ ...p, alternateCountryCode: e.target.value }))}
                    className="w-28 rounded-xl border border-line bg-white px-2 py-2 text-xs font-bold outline-purple"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={clientModal.alternatePhone}
                    onChange={e => setClientModal(p => ({ ...p, alternatePhone: e.target.value }))}
                    className="flex-1 rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <label className="block text-xs font-bold uppercase text-slate-500">GSTIN
                <input value={clientModal.gstin} onChange={e => setClientModal(p => ({ ...p, gstin: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="15-char GSTIN" />
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500">PAN
                <input value={clientModal.pan} onChange={e => setClientModal(p => ({ ...p, pan: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="PAN Number" />
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500">Industry
                <input value={clientModal.industry} onChange={e => setClientModal(p => ({ ...p, industry: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="e.g. IT Services" />
              </label>
              <label className="block text-xs font-bold uppercase text-slate-500 sm:col-span-2">Address
                <input value={clientModal.address} onChange={e => setClientModal(p => ({ ...p, address: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="Full Address" />
              </label>
              {clientModal.error && <p className="sm:col-span-2 text-xs font-semibold text-red-500">{clientModal.error}</p>}
              <div className="sm:col-span-2 mt-4 flex gap-3">
                <button type="button" onClick={() => setClientModal(p => ({ ...p, open: false }))} className="flex-1 rounded-xl border border-line py-2 font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={clientModal.loading} className="gradient-button flex-1 rounded-xl py-2 font-bold disabled:opacity-60">{clientModal.loading ? 'Saving...' : 'Save Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
