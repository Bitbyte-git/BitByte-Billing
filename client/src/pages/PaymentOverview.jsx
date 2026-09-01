import { CreditCard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import { currency, formatDate, getClientName, getInvoiceNumber, getQuotationNumber, recordId } from '../utils/format.js';
import { enrichInvoiceItem } from '../utils/invoiceItems.js';
import { openRazorpayCheckout } from '../utils/razorpayCheckout.js';

const entityId = (value) => (typeof value === 'string' ? value : recordId(value));

export default function PaymentOverview({ role }) {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentAction, setPaymentAction] = useState({ invoiceId: '', message: '', error: '' });

  const loadPaymentData = () => {
    setLoading(true);
    return Promise.all([api.get('/invoices'), api.get('/payments')])
      .then(([invoiceRes, paymentRes]) => {
        setInvoices(invoiceRes.data);
        setPayments(paymentRes.data);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load payment details.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPaymentData();
  }, []);

  const summary = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.amountPaid || 0), 0);
    const balancePending = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
    return { totalInvoiced, totalPaid, balancePending };
  }, [invoices]);

  const invoicesWithPayments = useMemo(() => invoices.map((invoice) => {
    const invoiceId = recordId(invoice);
    const paymentRows = payments
      .filter((payment) => entityId(payment.invoiceId) === invoiceId)
      .sort((a, b) => Number(a.paymentStageOrder || 0) - Number(b.paymentStageOrder || 0));
    const paidFromStages = paymentRows
      .filter((payment) => ['Paid', 'Partial'].includes(payment.paymentStatus || payment.status))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const total = Number(invoice.totalAmount || 0);
    const paid = Number(invoice.amountPaid ?? paidFromStages);
    const balance = Number(invoice.balanceDue ?? Math.max(total - paid, 0));
    return { invoice, paymentRows, total, paid, balance };
  }), [invoices, payments]);

  const startPayment = async (invoice) => {
    const invoiceId = recordId(invoice);
    setPaymentAction({ invoiceId, message: '', error: '' });
    try {
      const { data: order } = await api.post(`/payments/razorpay/client-invoice/${encodeURIComponent(invoiceId)}/order`);
      const response = await openRazorpayCheckout(order);
      await api.post('/payments/razorpay/verify', response);
      setPaymentAction({ invoiceId, message: 'Payment completed successfully.', error: '' });
      await loadPaymentData();
    } catch (err) {
      setPaymentAction({
        invoiceId,
        message: '',
        error: err.response?.data?.message || err.message || 'Payment could not be completed.',
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Workspace</p>
        <h1 className="text-3xl font-black">Payments & Balance</h1>
        <p className="mt-1 text-sm text-slate-500">Invoice totals, amount paid, balance pending, and payment stage details.</p>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p>}
      {loading && <p className="mb-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">Loading payment details...</p>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Total Invoiced</p>
          <p className="mt-2 text-2xl font-black">{currency(summary.totalInvoiced)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Total Paid</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{currency(summary.totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-slate-400">Balance Pending</p>
          <p className="mt-2 text-2xl font-black text-red-600">{currency(summary.balancePending)}</p>
        </div>
      </div>

      <div className="space-y-5">
        {invoicesWithPayments.map(({ invoice, paymentRows, total, paid, balance }) => {
          const invoiceRecordId = recordId(invoice);
          const isPaying = paymentAction.invoiceId === invoiceRecordId && !paymentAction.message && !paymentAction.error;
          const canPay = role === 'Client' && Number(balance || 0) > 0;
          return (
          <section key={recordId(invoice)} className="overflow-hidden rounded-2xl border border-line bg-white shadow-premium">
            <div className="border-b border-line bg-slate-50 p-5">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Invoice {invoice.invoiceId}</p>
                  <h2 className="text-xl font-black">{role === 'Client' ? (invoice.quotationId?.projectTitle || getQuotationNumber(invoice)) : getClientName(invoice)}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {getQuotationNumber(invoice)} · Due {formatDate(invoice.dueDate)} · {role !== 'Client' && getClientName(invoice)}
                  </p>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Invoice Total</p><strong>{currency(total)}</strong></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Paid</p><strong className="text-emerald-600">{currency(paid)}</strong></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Balance Pending</p><strong className="text-red-600">{currency(balance)}</strong></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold uppercase text-slate-400">Status</p><StatusBadge status={balance === 0 ? 'Paid' : paid > 0 ? 'Partial' : invoice.paymentStatus} /></div>
                </div>
              </div>
              {role === 'Client' && (
                <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-line bg-white p-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment Option</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {canPay ? `Pay the pending amount of ${currency(balance)} using Razorpay.` : 'This invoice has no pending amount.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startPayment(invoice)}
                    disabled={!canPay || isPaying}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <CreditCard size={18} />
                    {canPay ? isPaying ? 'Opening payment...' : `Pay ${currency(balance)}` : 'Payment completed'}
                  </button>
                </div>
              )}
              {paymentAction.invoiceId === invoiceRecordId && paymentAction.message && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{paymentAction.message}</p>}
              {paymentAction.invoiceId === invoiceRecordId && paymentAction.error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{paymentAction.error}</p>}
            </div>

            <div className="p-5">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Invoice Line Items (with SAC)</h3>
              <div className="mobile-table overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-3">S.No</th>
                      <th className="p-3">Service</th>
                      <th className="p-3">SAC</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Taxable</th>
                      <th className="p-3">CGST</th>
                      <th className="p-3">SGST</th>
                      <th className="p-3">IGST</th>
                      <th className="p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item, index) => {
                      const line = enrichInvoiceItem(item);
                      return (
                        <tr key={`${line.service}-${index}`} className="border-t border-line">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3 font-semibold">{line.service}</td>
                          <td className="p-3">{line.sacCode}</td>
                          <td className="p-3">{line.quantity}</td>
                          <td className="p-3">{currency(line.taxableValue)}</td>
                          <td className="p-3">{currency(line.cgstAmount)}</td>
                          <td className="p-3">{currency(line.sgstAmount)}</td>
                          <td className="p-3">{currency(line.igstAmount)}</td>
                          <td className="p-3 font-bold">{currency(line.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-slate-500">Payment Stages</h3>
              {paymentRows.length ? (
                <div className="space-y-3">
                  {paymentRows.map((payment, index) => (
                    <div key={recordId(payment)} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-purple/10 text-sm font-black text-purple">{index + 1}</span>
                          <div>
                            <p className="font-bold">{payment.paymentLabel || `Payment ${index + 1}`}</p>
                            <p className="text-xs text-slate-500">{payment.paymentId} · {getInvoiceNumber(payment)}</p>
                          </div>
                        </div>
                        <StatusBadge status={payment.paymentStatus || payment.status} />
                      </div>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div><p className="text-xs font-bold uppercase text-slate-400">Amount</p><strong>{currency(payment.amount)}</strong></div>
                        <div><p className="text-xs font-bold uppercase text-slate-400">Method</p><strong>{payment.paymentMethod || '-'}</strong></div>
                        <div><p className="text-xs font-bold uppercase text-slate-400">Paid Date</p><strong>{formatDate(payment.paymentDate)}</strong></div>
                        <div><p className="text-xs font-bold uppercase text-slate-400">Reference</p><strong>{payment.transactionReference || '-'}</strong></div>
                        {payment.notes && <div className="md:col-span-2 xl:col-span-4"><p className="text-xs font-bold uppercase text-slate-400">Notes</p><p className="mt-1 text-slate-600">{payment.notes}</p></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No payment stages recorded yet.</p>
              )}
            </div>
          </section>
        );})}
        {!loading && !invoicesWithPayments.length && (
          <p className="rounded-2xl border border-line bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">No invoices available for payment tracking.</p>
        )}
      </div>
    </div>
  );
}
