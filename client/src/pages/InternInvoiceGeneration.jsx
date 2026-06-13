import { Download, Mail, ReceiptText, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import api, { downloadInternInvoicePdf } from '../api.js';
import { currency, formatDate, recordId } from '../utils/format.js';

const initialForm = {
  internId: '',
  employeeName: '',
  collegeName: '',
  courseMajor: '',
  passedOut: '',
  address: '',
  phone: '',
  email: '',
  position: '',
  duration: '',
  amount: '',
  paymentId: '',
  paymentReceived: true,
  termsAndConditions: 'This amount is not refundable. You can get it as a service from Bit Byte Technologies.'
};

export default function InternInvoiceGeneration() {
  const [form, setForm] = useState(initialForm);
  const [invoice, setInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const amount = useMemo(() => Number(form.amount || invoice?.amount || 0), [form.amount, invoice]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const generate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post('/intern-invoices', {
        ...form,
        amount: Number(form.amount || 0)
      });
      setInvoice(data);
      setMessage({
        type: 'success',
        text: data.emailDeliveryStatus === 'Sent'
          ? 'Intern invoice generated and emailed successfully.'
          : 'Intern invoice generated. Email can be sent from here or management.'
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to generate intern invoice.' });
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async () => {
    if (!invoice) return;
    setSending(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post(`/intern-invoices/${recordId(invoice)}/send-email`);
      setInvoice(data.invoice);
      setMessage({ type: 'success', text: data.message || 'Intern invoice email updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to send intern invoice email.' });
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setInvoice(null);
    setMessage({ type: '', text: '' });
  };

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">Intern Workflow</p>
          <h1 className="text-3xl font-black">Intern Invoice Generation</h1>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold hover:bg-white"
        >
          <ReceiptText size={16} /> New invoice
        </button>
      </div>

      {message.text && (
        <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <form onSubmit={generate} className="overflow-hidden rounded-2xl border border-line bg-white shadow-premium">
          <div className="border-b border-line bg-gradient-to-r from-slate-950 via-slate-900 to-purple p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">Premium PDF Details</p>
            <h2 className="mt-2 text-2xl font-black">Corporate Intern Billing Invoice</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">Capture all fields required for the enhanced MNC-style PDF invoice.</p>
          </div>
          <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-slate-600">
              Intern ID optional
              <input
                value={form.internId}
                onChange={(event) => updateField('internId', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="Auto generated if empty"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Intern name
              <input
                value={form.employeeName}
                onChange={(event) => updateField('employeeName', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                required
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="Used for invoice email"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              College
              <input
                value={form.collegeName}
                onChange={(event) => updateField('collegeName', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Department
              <input
                value={form.courseMajor}
                onChange={(event) => updateField('courseMajor', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="CSE / BCA / MBA"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Passed out
              <input
                value={form.passedOut}
                onChange={(event) => updateField('passedOut', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="2026"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Phone number
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                required
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Description / position
              <input
                value={form.position}
                onChange={(event) => updateField('position', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="Web Development Internship"
                required
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Duration in days
              <input
                value={form.duration}
                onChange={(event) => updateField('duration', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="30 days"
                required
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Amount
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="9000"
                required
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Payment ID
              <input
                value={form.paymentId}
                onChange={(event) => updateField('paymentId', event.target.value)}
                className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
                placeholder="UPI / Razorpay / bank ref"
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.paymentReceived}
                onChange={(event) => updateField('paymentReceived', event.target.checked)}
                className="h-4 w-4 accent-purple"
              />
              Payment received
            </label>
            <label className="block text-sm font-bold text-slate-600 md:col-span-2">
              Address
              <textarea
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                className="mt-2 min-h-[96px] w-full rounded-xl border border-line px-4 py-3 outline-purple"
                required
              />
            </label>
            <label className="block text-sm font-bold text-slate-600 md:col-span-2">
              Terms and conditions
              <textarea
                value={form.termsAndConditions}
                onChange={(event) => updateField('termsAndConditions', event.target.value)}
                className="mt-2 min-h-[84px] w-full rounded-xl border border-line px-4 py-3 outline-purple"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="gradient-button inline-flex items-center gap-2 rounded-xl px-5 py-3 font-bold disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Generating...' : 'Generate Invoice'}
            </button>
            <button
              type="button"
              onClick={() => invoice && downloadInternInvoicePdf(recordId(invoice), invoice.invoiceId)}
              disabled={!invoice}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 font-bold transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={18} /> PDF
            </button>
            <button
              type="button"
              onClick={sendEmail}
              disabled={!invoice || sending}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 font-bold transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Mail size={18} /> {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
          </div>
        </form>

        <aside className="rounded-2xl border border-line bg-white p-6 shadow-premium">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Preview</p>
          <h2 className="mt-1 text-2xl font-black">{invoice?.invoiceId || 'Draft intern invoice'}</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Employee</p>
              <p className="font-bold text-slate-900">{invoice?.employeeName || form.employeeName || '-'}</p>
              <p className="text-slate-500">{invoice?.collegeName || form.collegeName || 'College optional'}</p>
              <p className="text-slate-500">{invoice?.courseMajor || form.courseMajor || 'Department optional'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface p-3">
                <p className="text-xs font-bold uppercase text-slate-400">Position</p>
                <p className="font-bold">{invoice?.position || form.position || '-'}</p>
              </div>
              <div className="rounded-xl bg-surface p-3">
                <p className="text-xs font-bold uppercase text-slate-400">Duration</p>
                <p className="font-bold">{invoice?.duration || form.duration || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface p-3">
                <p className="text-xs font-bold uppercase text-slate-400">Passed out</p>
                <p className="font-bold">{invoice?.passedOut || form.passedOut || '-'}</p>
              </div>
              <div className="rounded-xl bg-surface p-3">
                <p className="text-xs font-bold uppercase text-slate-400">Payment ID</p>
                <p className="break-words font-bold">{invoice?.paymentId || form.paymentId || '-'}</p>
              </div>
            </div>
            <div className="rounded-xl bg-purple/5 p-4">
              <p className="text-xs font-bold uppercase text-purple">Amount</p>
              <p className="mt-1 text-3xl font-black text-purple">{currency(amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Invoice Date</p>
                <p className="font-semibold">{formatDate(invoice?.invoiceDate || new Date())}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Email</p>
                <p className="font-semibold">{invoice?.emailDeliveryStatus || 'Pending'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
