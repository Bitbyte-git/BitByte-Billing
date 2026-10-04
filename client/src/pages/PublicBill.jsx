import { BadgeCheck, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import { COMPANY_NAME } from '../config/brand.js';
import { currency, formatDate } from '../utils/format.js';

function DetailCard({ label, value }) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-base font-black text-slate-950">{value || '-'}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong, tone }) {
  const color = tone === 'green' ? 'text-emerald-700' : tone === 'purple' ? 'text-purple-700' : 'text-slate-950';
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-3 last:border-b-0">
      <span className={strong ? 'font-black text-slate-950' : 'font-semibold text-slate-600'}>{label}</span>
      <span className={`font-black ${color}`}>{currency(value)}</span>
    </div>
  );
}

export default function PublicBill() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecord = () => {
    setLoading(true);
    setError('');
    return api.get(`/instant-bills/public/${encodeURIComponent(id)}`)
      .then(({ data }) => setRecord(data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to verify instant bill details.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-5xl overflow-hidden bg-slate-50 shadow-2xl">
        {/* Header Banner */}
        <div className="bg-slate-950 px-6 py-6 text-white md:px-8">
          <BrandLogo size="md" theme="dark" tagline={COMPANY_NAME} />
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Instant Bill Verification</p>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Verified Bill Details</h1>
            </div>
            {record && (
              <span className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">
                <BadgeCheck size={18} /> {record.status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8">
          {loading && <p className="border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Loading bill details...</p>}
          {error && <p className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p>}

          {record && !loading && !error && (
            <>
              {/* Header Info Grid */}
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <DetailCard label="Bill ID" value={record.billId} />
                <DetailCard label="Client Name" value={record.clientName} />
                <DetailCard label="Company" value={record.companyName} />
                <DetailCard label="Status" value={record.status} />
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <DetailCard label="Project Title" value={record.projectTitle} />
                <DetailCard label="Bill Date" value={formatDate(record.billDate)} />
                <DetailCard label="Due Date" value={formatDate(record.dueDate)} />
                <DetailCard label="Payment Terms" value={record.paymentTerms} />
              </div>

              {/* Line Items Table */}
              <div className="overflow-hidden border border-slate-200 bg-white">
                <div className="bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white">Payment Details</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3">S.No</th>
                        <th className="border-b border-slate-200 px-4 py-3">Description</th>
                        <th className="border-b border-slate-200 px-4 py-3">SAC Code</th>
                        <th className="border-b border-slate-200 px-4 py-3 text-center">Qty</th>
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
                          <td className="border-b border-slate-100 px-4 py-3 text-center font-bold">{item.quantity}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-right font-bold">{currency(item.taxableValue)}</td>
                          <td className="border-b border-slate-100 px-4 py-3 text-right font-black">{currency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Terms */}
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="border border-slate-200 bg-white p-5">
                  <h2 className="text-base font-black uppercase tracking-[0.14em] text-slate-950">Terms & Conditions</h2>
                  <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-600">
                    <li>• Payment is due upon receipt of this bill unless otherwise agreed.</li>
                    <li>• Late payments may attract interest as per applicable norms.</li>
                    <li>• GST @18% is applicable on all services as per government norms.</li>
                    <li>• Please mention the bill number for all communications and payments.</li>
                    <li className="text-slate-400">• This is an officially verified computer-generated bill.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 bg-white p-5">
                  <h2 className="text-base font-black uppercase tracking-[0.14em] text-slate-950">Bill Summary</h2>
                  <div className="mt-4">
                    <SummaryRow label="Taxable Amount" value={record.subtotal} />
                    <SummaryRow label="GST Total (18%)" value={record.gstAmount} />
                    <SummaryRow label="Bill Total" value={record.totalAmount} strong tone="purple" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
