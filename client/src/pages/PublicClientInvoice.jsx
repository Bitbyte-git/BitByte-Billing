import { BadgeCheck, CreditCard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import { COMPANY_NAME } from '../config/brand.js';
import { currency, formatDate } from '../utils/format.js';
import { openRazorpayCheckout } from '../utils/razorpayCheckout.js';

function DetailCard({ label, value }) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-base font-black text-slate-950">{value || '-'}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong, tone }) {
  const color = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-slate-950';
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-3 last:border-b-0">
      <span className={strong ? 'font-black text-slate-950' : 'font-semibold text-slate-600'}>{label}</span>
      <span className={`font-black ${color}`}>{currency(value)}</span>
    </div>
  );
}

export default function PublicClientInvoice() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({ loading: false, message: '', error: '' });

  const fetchRecord = () => {
    setLoading(true);
    setError('');
    return api.get(`/invoices/public/${encodeURIComponent(id)}`)
      .then(({ data }) => setRecord(data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to verify client invoice.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const balanceTone = useMemo(() => Number(record?.balanceDue || 0) > 0 ? 'red' : 'green', [record]);
  const hasPendingAmount = Number(record?.payableAmount ?? record?.balanceDue ?? 0) > 0;

  const startPayment = async () => {
    setPayment({ loading: true, message: '', error: '' });
    try {
      const { data: order } = await api.post(`/payments/razorpay/client-invoice/${encodeURIComponent(id)}/order`);
      const response = await openRazorpayCheckout(order);
      await api.post('/payments/razorpay/verify', response);
      setPayment({ loading: false, message: 'Payment completed successfully.', error: '' });
      await fetchRecord();
    } catch (err) {
      setPayment({
        loading: false,
        message: '',
        error: err.response?.data?.message || err.message || 'Payment could not be completed.',
      });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-5xl overflow-hidden bg-slate-50 shadow-2xl">
        <div className="bg-slate-950 px-6 py-6 text-white md:px-8">
          <BrandLogo size="md" theme="dark" tagline={COMPANY_NAME} />
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Client Invoice Verification</p>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Verified price details</h1>
            </div>
            {record && (
              <span className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">
                <BadgeCheck size={18} /> {record.status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8">
          {loading && <p className="border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Loading verification details...</p>}
          {error && <p className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p>}

          {record && !loading && !error && (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <DetailCard label="Invoice ID" value={record.invoiceId} />
                <DetailCard label="Client" value={record.clientName} />
                <DetailCard label="Invoice Date" value={formatDate(record.invoiceDate)} />
                <DetailCard label="Payment Status" value={record.paymentStatus} />
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <DetailCard label="Quotation ID" value={record.quotationId} />
                <DetailCard label="Project Title" value={record.projectTitle} />
                <DetailCard label="Due Date" value={formatDate(record.dueDate)} />
                <DetailCard label="Client Email" value={record.clientEmail} />
              </div>

              <div className="overflow-hidden border border-slate-200 bg-white">
                <div className="bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white">Price Details</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3">S.No</th>
                        <th className="border-b border-slate-200 px-4 py-3">Description</th>
                        <th className="border-b border-slate-200 px-4 py-3">SAC</th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right">Taxable</th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(record.items || []).map((item, index) => (
                        <tr key={`${item.service}-${index}`}>
                          <td className="border-b border-slate-100 px-4 py-3 font-bold">{index + 1}</td>
                          <td className="border-b border-slate-100 px-4 py-3">
                            <p className="font-black text-slate-950">{item.service}</p>
                            {item.description && <p className="mt-1 text-xs font-semibold text-slate-500">{item.description}</p>}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 font-bold">{item.sacCode}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-right font-bold">{currency(item.taxableValue)}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-right font-black">{currency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 ml-auto max-w-md border border-slate-200 bg-white p-5">
                <h2 className="text-base font-black uppercase tracking-[0.14em] text-slate-950">Invoice Summary</h2>
                <div className="mt-4">
                  <SummaryRow label="Taxable Amount" value={record.taxableAmount} />
                  <SummaryRow label="GST Amount" value={record.gstAmount} />
                  <SummaryRow label="Invoice Total" value={record.totalAmount} strong />
                  <SummaryRow label="Amount Paid" value={record.amountPaid} />
                  <SummaryRow label="Balance" value={record.balanceDue} strong tone={balanceTone} />
                </div>
                <button
                  type="button"
                  onClick={startPayment}
                  disabled={!hasPendingAmount || payment.loading}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <CreditCard size={18} />
                  {hasPendingAmount ? payment.loading ? 'Opening payment...' : `Pay ${currency(record.payableAmount || record.balanceDue)}` : 'Payment completed'}
                </button>
                {payment.message && <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{payment.message}</p>}
                {payment.error && <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{payment.error}</p>}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
