import { useEffect, useMemo, useState } from 'react';
import { Download, Edit3, GraduationCap, Mail, Plus, ReceiptText, RefreshCw, Save, Search, Send, Trash2 } from 'lucide-react';
import api, { downloadInternInvoicePdf } from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency, formatDate, recordId } from '../utils/format.js';

const emptyForm = {
  internId: '',
  employeeName: '',
  email: '',
  collegeName: '',
  courseMajor: '',
  address: '',
  phone: '',
  position: '',
  duration: '',
  amount: '',
  paymentStatus: 'Paid'
};

function formFromRecord(record) {
  return {
    internId: record.internId || '',
    employeeName: record.employeeName || record.empName || '',
    email: record.email || '',
    collegeName: record.collegeName || '',
    courseMajor: record.courseMajor || '',
    address: record.address || '',
    phone: record.phone || record.phoneNo || '',
    position: record.position || '',
    duration: record.duration || '',
    amount: record.amount ? String(record.amount) : '',
    paymentStatus: record.paymentReceived || record.paymentStatus === 'Paid' ? 'Paid' : 'Pending'
  };
}

function emailTone(status) {
  if (status === 'Sent') return 'text-emerald-700';
  if (status === 'Failed') return 'text-red-600';
  if (status === 'Skipped') return 'text-amber-700';
  return 'text-slate-500';
}

export default function InternInvoiceManagement() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const paidRecords = useMemo(() => records.filter((record) => record.paymentReceived || record.paymentStatus === 'Paid').length, [records]);
  const generatedRecords = useMemo(() => records.filter((record) => record.invoiceId).length, [records]);
  const totalCollected = useMemo(
    () => records
      .filter((record) => record.paymentReceived || record.paymentStatus === 'Paid')
      .reduce((sum, record) => sum + Number(record.amount || 0), 0),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) => JSON.stringify(record).toLowerCase().includes(needle));
  }, [records, search]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/intern-invoices');
      setRecords(data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load intern invoices.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setMessage({ type: '', text: '' });
  };

  const saveRecord = async ({ generateAfter = false } = {}) => {
    setMessage({ type: '', text: '' });
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount || 0),
        paymentReceived: form.paymentStatus === 'Paid',
        draft: true,
        sendEmail: false
      };
      const request = editingId
        ? api.put(`/intern-invoices/${editingId}`, payload)
        : api.post('/intern-invoices', payload);
      const { data } = await request;
      let saved = data;

      if (generateAfter) {
        const generated = await api.post(`/intern-invoices/${recordId(saved)}/generate`);
        saved = generated.data;
      }

      await loadRecords();
      setEditingId(recordId(saved));
      setForm(formFromRecord(saved));
      setMessage({
        type: 'success',
        text: generateAfter ? 'Intern invoice generated successfully.' : 'Intern details saved successfully.'
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to save intern invoice.' });
    } finally {
      setSaving(false);
    }
  };

  const syncGoogleForm = async () => {
    setMessage({ type: '', text: '' });
    setSyncing(true);
    try {
      const { data } = await api.post('/intern-invoices/sync-google-form');
      await loadRecords();
      const summary = data.summary || {};
      setMessage({
        type: 'success',
        text: `Google Form synced. Created ${summary.created || 0}, updated ${summary.updated || 0}, skipped ${summary.skipped || 0}.`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to sync Google Form responses.' });
    } finally {
      setSyncing(false);
    }
  };

  const loadByInternId = () => {
    const internId = form.internId.trim().toLowerCase();
    if (!internId) return;

    const record = records.find((item) => String(item.internId || '').toLowerCase() === internId);
    if (!record) {
      setMessage({ type: 'error', text: 'No fetched intern found for this Intern ID.' });
      return;
    }

    editRecord(record);
  };

  const editRecord = (record) => {
    setEditingId(recordId(record));
    setForm(formFromRecord(record));
    setMessage({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateRecord = async (record) => {
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/intern-invoices/${recordId(record)}/generate`);
      await loadRecords();
      setMessage({ type: 'success', text: 'Intern invoice generated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to generate intern invoice.' });
    }
  };

  const sendEmail = async (record) => {
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post(`/intern-invoices/${recordId(record)}/send-email`);
      await loadRecords();
      setMessage({ type: 'success', text: data.message || 'Intern invoice email processed.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to send intern invoice email.' });
    }
  };

  const deleteRecord = async (record) => {
    if (!window.confirm('Delete this intern invoice record?')) return;
    try {
      await api.delete(`/intern-invoices/${recordId(record)}`);
      if (editingId === recordId(record)) resetForm();
      await loadRecords();
      setMessage({ type: 'success', text: 'Intern invoice record deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to delete intern invoice.' });
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">Intern Billing</p>
          <h1 className="text-3xl font-black">Intern Invoice Management</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={syncGoogleForm}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple/30 bg-purple/5 px-4 py-3 text-sm font-bold text-purple hover:bg-purple/10 disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync GForm'}
          </button>
          <button
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50"
          >
            <Plus size={18} /> New intern
          </button>
        </div>
      </div>

      {message.text && (
        <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </p>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Paid interns</p>
          <strong className="mt-2 block text-2xl">{paidRecords}</strong>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Generated invoices</p>
          <strong className="mt-2 block text-2xl">{generatedRecords}</strong>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount collected</p>
          <strong className="mt-2 block text-2xl text-purple">{currency(totalCollected)}</strong>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-premium">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple/10 text-purple">
              <GraduationCap size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {editingId ? 'Edit intern form' : 'Intern form'}
              </p>
              <h2 className="text-xl font-black">{editingId ? 'Update details' : 'Fill intern details'}</h2>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="block text-sm font-bold text-slate-600">
              Intern ID
              <div className="mt-2 flex gap-2">
                <input
                  value={form.internId}
                  onChange={(event) => updateForm('internId', event.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-line px-4 py-3 outline-purple"
                  placeholder="BBT-INT-0001"
                />
                <button
                  onClick={loadByInternId}
                  className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-3 text-sm font-bold hover:bg-slate-50"
                >
                  Load
                </button>
              </div>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Employee / intern name
              <input
                value={form.employeeName}
                onChange={(event) => updateForm('employeeName', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="Enter name"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Employee email
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="name@example.com"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              College name optional
              <input
                value={form.collegeName}
                onChange={(event) => updateForm('collegeName', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="College name"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Course major
              <input
                value={form.courseMajor}
                onChange={(event) => updateForm('courseMajor', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="CSE / BCA / MBA"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Address
              <textarea
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="Address"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="block text-sm font-bold text-slate-600">
                Phone no
                <input
                  value={form.phone}
                  onChange={(event) => updateForm('phone', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                  placeholder="Phone number"
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Position
                <input
                  value={form.position}
                  onChange={(event) => updateForm('position', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                  placeholder="Developer"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="block text-sm font-bold text-slate-600">
                Duration
                <input
                  value={form.duration}
                  onChange={(event) => updateForm('duration', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                  placeholder="1 month"
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Amount
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(event) => updateForm('amount', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                  placeholder="9000"
                />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-600">
              Payment status
              <select
                value={form.paymentStatus}
                onChange={(event) => updateForm('paymentStatus', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-purple"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => saveRecord()}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              <Save size={17} /> Save
            </button>
            <button
              onClick={() => saveRecord({ generateAfter: true })}
              disabled={saving}
              className="gradient-button inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50"
            >
              <ReceiptText size={17} /> Save & generate
            </button>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-premium">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Intern invoice list</p>
              <h2 className="text-xl font-black">Invoice management</h2>
            </div>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 md:w-72">
              <Search size={17} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search interns..."
              />
            </label>
          </div>

          {loading && (
            <p className="mb-4 rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-slate-500">
              Loading intern invoices...
            </p>
          )}

          <div className="mobile-table overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">Intern</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={recordId(record)} className="border-t border-line align-top">
                    <td className="p-3">
                      <p className="font-bold">{record.employeeName || record.empName}</p>
                      <p className="text-xs text-slate-500">{record.email}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{record.internId}</p>
                      {record.source === 'Google Form' && <p className="mt-1 text-xs font-bold text-purple">Google Form</p>}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">{record.position}</p>
                      <p className="text-xs text-slate-500">{record.courseMajor || record.duration}</p>
                      {record.courseMajor && <p className="text-xs text-slate-400">{record.duration || 'Duration pending'}</p>}
                    </td>
                    <td className="p-3 font-bold">{currency(record.amount)}</td>
                    <td className="p-3"><StatusBadge status={record.paymentReceived || record.paymentStatus === 'Paid' ? 'Paid' : 'Pending'} /></td>
                    <td className="p-3">
                      <p className="font-semibold">{record.invoiceId || 'Not generated'}</p>
                      <p className="text-xs text-slate-500">{formatDate(record.invoiceDate)}</p>
                      <div className="mt-1"><StatusBadge status={record.invoiceId ? 'Generated' : 'Draft'} /></div>
                    </td>
                    <td className="p-3">
                      <p className={`text-xs font-bold ${emailTone(record.emailDeliveryStatus)}`}>
                        {record.emailDeliveryStatus || 'Pending'}
                      </p>
                      {record.sentAt && <p className="text-xs text-slate-500">{formatDate(record.sentAt)}</p>}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => editRecord(record)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-slate-600 hover:bg-slate-50"
                          title="Edit intern"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => generateRecord(record)}
                          disabled={!record.paymentReceived && record.paymentStatus !== 'Paid'}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-purple hover:bg-purple/5 disabled:opacity-40"
                          title="Generate invoice"
                        >
                          <ReceiptText size={16} />
                        </button>
                        <button
                          onClick={() => downloadInternInvoicePdf(recordId(record), record.invoiceId || record.internId)}
                          disabled={!record.invoiceId}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-purple hover:bg-purple/5 disabled:opacity-40"
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => sendEmail(record)}
                          disabled={!record.invoiceId || (!record.paymentReceived && record.paymentStatus !== 'Paid')}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-purple hover:bg-purple/5 disabled:opacity-40"
                          title="Send email"
                        >
                          {record.invoiceId ? <Send size={16} /> : <Mail size={16} />}
                        </button>
                        <button
                          onClick={() => deleteRecord(record)}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-red-600 hover:bg-red-50"
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !filteredRecords.length && (
              <p className="p-4 text-sm font-semibold text-slate-500">No intern invoice records found.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
