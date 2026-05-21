import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, Eye, ArrowLeft } from 'lucide-react';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency } from '../utils/constants.js';
import { quotationsAPI } from '../api.js';

/* ─── Sub-component: Costing editor for one selected quotation ─── */
function CostingEditor({ quotation, onDone }) {
  const defaultRows = () =>
    (quotation.subServices?.length ? quotation.subServices : [quotation.mainService]).map((svc) => ({
      serviceName: svc,
      description: '',
      estimatedCost: 25000,
      gstPercentage: 18,
    }));

  const [rows, setRows] = useState(defaultRows);
  const [remarks, setRemarks] = useState(quotation.accountantRemarks || '');
  const [submitting, setSubmitting] = useState(false);

  const update = (i, key, val) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
  const remove = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const add = () =>
    setRows((r) => [...r, { serviceName: 'Custom Item', description: '', estimatedCost: 10000, gstPercentage: 18 }]);

  const subtotal = useMemo(() => rows.reduce((s, r) => s + Number(r.estimatedCost || 0), 0), [rows]);
  const gst = useMemo(
    () => rows.reduce((s, r) => s + Number(r.estimatedCost || 0) * (Number(r.gstPercentage || 0) / 100), 0),
    [rows]
  );

  const doAction = async (action) => {
    setSubmitting(true);
    try {
      if (action === 'costing' || action === 'forward') {
        await quotationsAPI.addCosting(quotation._id, {
          items: rows.map((r) => ({ ...r, quotationId: quotation._id })),
          accountantRemarks: remarks,
        });
      }
      if (action === 'clarify') {
        await quotationsAPI.requestClarification(quotation._id, remarks);
      }
      if (action === 'forward') {
        await quotationsAPI.forwardToAdmin(quotation._id);
      }
      onDone();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onDone} className="rounded-xl border border-line bg-white p-3 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">Accountant Workflow</p>
          <h1 className="text-2xl font-black">{quotation.projectTitle}</h1>
          <p className="text-sm text-slate-500">{quotation.quotationId} · {quotation.mainService}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={quotation.status} /></div>
      </div>

      {/* Client & Service Summary */}
      <div className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-premium">
        <h2 className="mb-4 text-base font-black">Quotation Summary</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Client</p>
            <p className="mt-1 font-semibold">{quotation.clientId?.companyName || quotation.clientId?.fullName || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Main Service</p>
            <p className="mt-1 font-semibold">{quotation.mainService}</p>
          </div>
          <div className="rounded-xl bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Priority</p>
            <p className="mt-1 font-semibold">{quotation.priorityLevel || 'Medium'}</p>
          </div>
          {quotation.subServices?.length > 0 && (
            <div className="rounded-xl bg-purple/5 border border-purple/10 p-4 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Sub-Services Requested</p>
              <div className="flex flex-wrap gap-2">
                {quotation.subServices.map((s) => (
                  <span key={s} className="rounded-full bg-purple/10 px-3 py-1 text-xs font-bold text-purple">{s}</span>
                ))}
              </div>
            </div>
          )}
          {quotation.requirementDetails && (
            <div className="rounded-xl bg-surface p-4 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Client Requirements</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{quotation.requirementDetails}</p>
            </div>
          )}
        </div>
      </div>

      {/* Costing Grid + Summary */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-3 text-lg font-black">Pricing Breakdown</h2>
          <div className="rounded-2xl border border-line bg-white shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-3">Service / Item</th>
                    <th className="p-3">Scope Note</th>
                    <th className="p-3">Estimated Cost (₹)</th>
                    <th className="p-3">GST %</th>
                    <th className="p-3">Total</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const total = Number(row.estimatedCost || 0) * (1 + Number(row.gstPercentage || 0) / 100);
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="p-3">
                          <input
                            value={row.serviceName}
                            onChange={(e) => update(i, 'serviceName', e.target.value)}
                            className="w-44 rounded-lg border border-line px-3 py-2 text-sm font-semibold outline-purple"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            value={row.description}
                            onChange={(e) => update(i, 'description', e.target.value)}
                            className="w-52 rounded-lg border border-line px-3 py-2 text-sm outline-purple"
                            placeholder="Scope note..."
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={row.estimatedCost}
                            onChange={(e) => update(i, 'estimatedCost', e.target.value)}
                            className="w-32 rounded-lg border border-line px-3 py-2 text-sm outline-purple"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={row.gstPercentage}
                            onChange={(e) => update(i, 'gstPercentage', e.target.value)}
                            className="w-16 rounded-lg border border-line px-3 py-2 text-sm outline-purple"
                          />
                        </td>
                        <td className="p-3 font-bold text-slate-800">{currency(total)}</td>
                        <td className="p-3">
                          {rows.length > 1 && (
                            <button onClick={() => remove(i)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={add}
              className="m-4 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-purple hover:bg-purple/5 transition-colors"
            >
              <Plus size={16} /> Add service row
            </button>
          </div>

          <label className="mt-5 block text-sm font-bold">
            Accountant Remarks (visible to client & admin)
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-white p-4 shadow-sm outline-purple"
              placeholder="Add internal remarks or clarification notes..."
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={submitting}
              onClick={() => doAction('costing')}
              className="rounded-xl border border-line bg-white px-5 py-3 font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Costing'}
            </button>
            <button
              disabled={submitting || !remarks.trim()}
              onClick={() => doAction('clarify')}
              className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
            >
              Request Clarification
            </button>
            <button
              disabled={submitting || subtotal === 0}
              onClick={() => doAction('forward')}
              className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50"
            >
              {submitting ? 'Forwarding...' : 'Forward to Admin'}
            </button>
          </div>
        </section>
        <AmountSummaryCard subtotal={subtotal} gst={gst} />
      </div>
    </div>
  );
}

/* ─── Main Page: Quotation Queue ─── */
export default function PricingPage() {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    quotationsAPI
      .list()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.quotations || [];
        const pending = list.filter(
          (q) => q.status === 'Submitted' || q.status === 'Needs Clarification'
        );
        setQuotations(pending);

        // If a specific quotation ID is in the URL, pre-select it
        if (quotationId) {
          const match = list.find((q) => q._id === quotationId);
          if (match) setSelected(match);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDone = () => {
    setSelected(null);
    navigate('/accountant/pricing');
    fetchData();
  };

  if (loading) return <div className="py-10 text-center font-semibold text-slate-500">Loading quotations...</div>;

  if (selected) return <CostingEditor quotation={selected} onDone={handleDone} />;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Accountant Workflow</p>
        <h1 className="text-3xl font-black">Pricing & Costing Queue</h1>
        <p className="mt-1 text-sm text-slate-500">Select a submitted quotation to add pricing breakdown and forward to admin.</p>
      </div>

      {quotations.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Queue is empty!</h2>
          <p className="mt-2 text-slate-500">No quotations are currently awaiting costing.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quotations.map((q) => (
            <div
              key={q._id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 shadow-premium transition-shadow hover:shadow-lg md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">{q.quotationId}</span>
                  <StatusBadge status={q.status} />
                  {q.priorityLevel === 'High' || q.priorityLevel === 'Critical' ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{q.priorityLevel}</span>
                  ) : null}
                </div>
                <h2 className="mt-1 text-lg font-black text-slate-900">{q.projectTitle}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span><strong className="text-slate-700">{q.clientId?.companyName || q.clientId?.fullName || 'N/A'}</strong></span>
                  <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-bold text-purple">{q.mainService}</span>
                  {q.subServices?.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs text-slate-400">{s}</span>
                  ))}
                  {q.subServices?.length > 3 && <span className="text-xs text-slate-400">+{q.subServices.length - 3} more</span>}
                </div>
                {q.budgetRange && (
                  <p className="mt-1 text-xs text-slate-400">Budget: <strong className="text-slate-600">{q.budgetRange}</strong></p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/accountant/quotations/${q._id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  <Eye size={16} /> View
                </Link>
                <button
                  onClick={() => setSelected(q)}
                  className="gradient-button inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
                >
                  Add Costing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
