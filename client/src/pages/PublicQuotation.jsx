import { BadgeCheck, FileText, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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

export default function PublicQuotation() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecord = () => {
    setLoading(true);
    setError('');
    return api.get(`/quotations/public/${encodeURIComponent(id)}`)
      .then(({ data }) => setRecord(data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to verify quotation details.'))
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
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Quotation Verification</p>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Verified Quotation Details</h1>
            </div>
            {record && (
              <span className="inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">
                <BadgeCheck size={18} /> {record.status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8">
          {loading && <p className="border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Loading quotation details...</p>}
          {error && <p className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p>}

          {record && !loading && !error && (
            <>
              {/* Header Info Grid */}
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <DetailCard label="Quotation ID" value={record.quotationId} />
                <DetailCard label="Client Name" value={record.clientName} />
                <DetailCard label="Company" value={record.companyName} />
                <DetailCard label="Status" value={record.status} />
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <DetailCard label="Project Title" value={record.projectTitle} />
                <DetailCard label="Quotation Date" value={formatDate(record.submittedAt || record.createdAt)} />
                <DetailCard label="Valid Until" value={formatDate(record.validUntil)} />
                <DetailCard label="Client Email" value={record.clientEmail} />
              </div>

              {/* Line Items Table */}
              <div className="overflow-hidden border border-slate-200 bg-white">
                <div className="bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white">Itemized Services Breakdown</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-[0.12em] text-slate-600">
                      <tr>
                        <th className="border-b border-slate-200 px-4 py-3">S.No</th>
                        <th className="border-b border-slate-200 px-4 py-3">Description of Service</th>
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
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-slate-950">{item.service}</p>
                              {(item.isComplimentary || item.tier === 'Complimentary' || (Number(item.total || 0) === 0 && (item.description || '').toLowerCase().includes('complimentary')) || (Number(item.basePrice || 0) === 0 && Number(item.total || 0) === 0)) && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
                                  🎁 Complimentary
                                </span>
                              )}
                            </div>
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
                  
                  {/* Payment Milestone Box */}
                  <div className="mt-3 mb-4 rounded-xl border border-purple/20 bg-purple/5 p-3.5">
                    <p className="text-xs font-black uppercase tracking-wider text-purple">💳 Payment Milestones</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-white p-2 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Stage 1</p>
                        <p className="font-black text-slate-900 mt-0.5">70%</p>
                        <p className="text-[10px] font-semibold text-slate-600">Initial Payment</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Stage 2</p>
                        <p className="font-black text-slate-900 mt-0.5">15%</p>
                        <p className="text-[10px] font-semibold text-slate-600">Client Checking</p>
                      </div>
                      <div className="rounded-lg bg-white p-2 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Stage 3</p>
                        <p className="font-black text-slate-900 mt-0.5">15%</p>
                        <p className="text-[10px] font-semibold text-slate-600">Final Handover</p>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs font-semibold text-slate-600">
                    <li>• Initial Payment: 70% advance upon project sign-off.</li>
                    <li>• Client Checking Handover: 15% on review milestone delivery.</li>
                    <li>• Final Handover: 15% upon completed final deployment and sign-off.</li>
                    <li>• This quotation is valid for 15 days from the date of issue.</li>
                    <li>• GST @18% is applicable on all services as per government norms.</li>
                    <li className="text-slate-400">• This is an officially verified computer-generated quotation.</li>
                  </ul>
                </div>

                <div className="border border-slate-200 bg-white p-5">
                  <h2 className="text-base font-black uppercase tracking-[0.14em] text-slate-950">Quotation Summary</h2>
                  <div className="mt-4">
                    <SummaryRow label="Taxable Amount" value={record.subtotal} />
                    <SummaryRow label="GST Total (18%)" value={record.gstAmount} />
                    <SummaryRow label="Quotation Total" value={record.totalAmount} strong tone="purple" />
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
