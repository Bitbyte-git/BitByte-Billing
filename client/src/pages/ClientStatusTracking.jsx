import { ArrowRight, CreditCard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency, formatDate, recordId } from '../utils/format.js';

const trackingStages = ['Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Rejected', 'Invoice Generated', 'Paid'];

export default function ClientStatusTracking() {
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.get('/quotations'), api.get('/invoices')])
      .then(([quotationRes, invoiceRes]) => {
        setQuotations(quotationRes.data);
        setInvoices(invoiceRes.data);
        setSelectedId((current) => current || recordId(quotationRes.data[0]) || '');
      })
      .catch((err) => setMessage(err.response?.data?.message || 'Unable to load quotation tracking.'));
  }, []);

  const selectedQuotation = useMemo(
    () => quotations.find((quotation) => recordId(quotation) === selectedId) || quotations[0],
    [quotations, selectedId],
  );

  const selectedInvoice = useMemo(() => {
    if (!selectedQuotation) return null;
    const quotationId = recordId(selectedQuotation);
    return invoices.find((invoice) => {
      const invoiceQuotationId = typeof invoice.quotationId === 'string' ? invoice.quotationId : recordId(invoice.quotationId);
      return invoiceQuotationId === quotationId;
    });
  }, [invoices, selectedQuotation]);

  const selectedIndex = Math.max(0, trackingStages.indexOf(selectedQuotation?.status || 'Submitted'));
  const progress = selectedQuotation ? Math.round(((selectedIndex + 1) / trackingStages.length) * 100) : 0;
  const nextStage = selectedQuotation?.status === 'Rejected'
    ? 'Review rejected remarks'
    : trackingStages[Math.min(selectedIndex + 1, trackingStages.length - 1)];
  const invoiceBalance = Number(selectedInvoice?.balanceDue || 0);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Client Progress</p>
        <h1 className="text-3xl font-black">Quotation Status Tracking</h1>
      </div>
      {message && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{message}</p>}

      {selectedQuotation && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-line bg-white shadow-premium">
          <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
            <div className="border-b border-line bg-slate-50 p-5 lg:border-b-0 lg:border-r">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Select Quotation</p>
              <div className="mt-4 space-y-3">
                {quotations.map((quotation) => {
                  const active = recordId(quotation) === recordId(selectedQuotation);
                  return (
                    <button
                      key={recordId(quotation)}
                      type="button"
                      onClick={() => setSelectedId(recordId(quotation))}
                      className={`w-full rounded-xl border p-4 text-left transition ${active ? 'border-purple bg-purple/10 shadow-sm' : 'border-line bg-white hover:border-purple/40 hover:bg-purple/5'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">{quotation.projectTitle}</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">{quotation.quotationId}</p>
                        </div>
                        <StatusBadge status={quotation.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-purple">Interactive Progress</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedQuotation.projectTitle}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {selectedQuotation.quotationId} · Last updated {formatDate(selectedQuotation.updatedAt || selectedQuotation.submittedAt)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                  <div className="rounded-xl border border-line bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Current Stage</p>
                    <p className="mt-2 font-black text-slate-950">{selectedQuotation.status}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Next Action</p>
                    <p className="mt-2 font-black text-slate-950">{nextStage}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">Progress</p>
                    <p className="mt-2 font-black text-slate-950">{progress}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-purple to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                {trackingStages.map((stage, index) => {
                  const complete = index <= selectedIndex && selectedQuotation.status !== 'Rejected';
                  const active = stage === selectedQuotation.status;
                  return (
                    <button
                      key={stage}
                      type="button"
                      className={`rounded-xl border p-3 text-left transition ${active ? 'border-purple bg-purple/10' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-line bg-white hover:bg-slate-50'}`}
                    >
                      <div className={`mb-2 h-2 rounded-full ${active ? 'bg-purple' : complete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      <p className={`text-xs font-bold ${active ? 'text-purple' : complete ? 'text-emerald-700' : 'text-slate-400'}`}>{stage}</p>
                    </button>
                  );
                })}
              </div>

              {selectedInvoice && (
                <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-line bg-slate-950 p-5 text-white md:flex-row md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Invoice Payment</p>
                    <p className="mt-2 text-xl font-black">{selectedInvoice.invoiceId} · Pending {currency(invoiceBalance)}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-300">Open the payment section to complete pending invoices securely.</p>
                  </div>
                  <Link to="/client/payments" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">
                    <CreditCard size={18} /> Go to Payment <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-black">Workflow Timeline</h2>
            <p className="mt-1 text-sm text-slate-500">Track each quotation from submission through invoice and payment.</p>
          </div>
          <span className="rounded-full bg-purple/10 px-3 py-1 text-xs font-bold text-purple">{quotations.length} quotations</span>
        </div>
        <div className="space-y-4">
          {quotations.map((quotation) => {
            const currentIndex = Math.max(0, trackingStages.indexOf(quotation.status));
            const assignedAccountant = quotation.costingItems?.find((item) => item.addedByAccountantName)?.addedByAccountantName || 'Pending assignment';
            return (
              <div key={recordId(quotation)} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h3 className="font-black text-slate-900">{quotation.projectTitle}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{quotation.quotationId} · Last updated {formatDate(quotation.updatedAt || quotation.submittedAt)}</p>
                    <p className="mt-1 text-sm text-slate-500">Assigned accountant/admin: {assignedAccountant}</p>
                  </div>
                  <StatusBadge status={quotation.status} />
                </div>
                <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
                  {trackingStages.map((stage, index) => {
                    const complete = index <= currentIndex && quotation.status !== 'Rejected';
                    const active = stage === quotation.status;
                    return (
                      <div key={stage} className={`rounded-xl border p-3 ${active ? 'border-purple bg-purple/10' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-line bg-white'}`}>
                        <div className={`mb-2 h-2 rounded-full ${active ? 'bg-purple' : complete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <p className={`text-xs font-bold ${active ? 'text-purple' : complete ? 'text-emerald-700' : 'text-slate-400'}`}>{stage}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!quotations.length && <p className="rounded-xl border border-dashed border-line p-5 text-sm font-semibold text-slate-500">No quotations available for tracking.</p>}
        </div>
      </section>
    </div>
  );
}
