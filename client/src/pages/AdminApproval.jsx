import { useEffect, useMemo, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import api from '../api.js';
import { currency, formatDate, getClientName, recordId, serviceNames } from '../utils/format.js';

export default function AdminApproval() {
  const [modal, setModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [quotations, setQuotations] = useState([]);
  const [quotationId, setQuotationId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [discount, setDiscount] = useState({ type: 'None', value: '' });
  const selected = useMemo(() => quotations.find((item) => recordId(item) === quotationId), [quotations, quotationId]);
  const pricing = useMemo(() => {
    const baseSubtotal = Number(selected?.subtotal || 0);
    const value = Math.max(Number(discount.value || 0), 0);
    const discountedAmount = discount.type === 'Percentage'
      ? Math.min(baseSubtotal * Math.min(value, 100) / 100, baseSubtotal)
      : discount.type === 'Fixed Amount'
        ? Math.min(value, baseSubtotal)
        : 0;
    const finalSubtotal = Math.max(baseSubtotal - discountedAmount, 0);
    const gstRate = baseSubtotal ? Number(selected?.gstAmount || 0) / baseSubtotal : 0;
    const gst = finalSubtotal * gstRate;
    return { baseSubtotal, discountedAmount, finalSubtotal, gst };
  }, [selected, discount]);

  const load = () => api.get('/quotations')
    .then(({ data }) => {
      const pending = data.filter((item) => item.status === 'Forwarded to Admin');
      setQuotations(pending);
      if (!quotationId && pending[0]) setQuotationId(recordId(pending[0]));
    })
    .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load approvals.' }));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    setDiscount({
      type: selected.finalDiscountType || 'None',
      value: selected.finalDiscountValue ? String(selected.finalDiscountValue) : ''
    });
  }, [selected?._id]);

  const decide = async () => {
    if (!selected || !modal) return;
    try {
      const endpoint = modal === 'Approve Quotation' ? 'approve' : 'reject';
      await api.post(`/quotations/${recordId(selected)}/${endpoint}`, {
        adminRemarks: remarks,
        discountType: discount.type,
        discountValue: Number(discount.value || 0)
      });
      setModal(null);
      setRemarks('');
      setMessage({ type: 'success', text: endpoint === 'approve' ? 'Quotation approved.' : 'Quotation rejected.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to update approval.' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workflow</p>
        <h1 className="text-3xl font-black">Pending Approvals</h1>
      </div>
      {message.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}
      <label className="mb-5 block rounded-2xl border border-line bg-white p-4 text-sm font-bold shadow-sm">Quotation
        <select value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple">
          <option value="">Select quotation</option>
          {quotations.map((quotation) => <option key={recordId(quotation)} value={recordId(quotation)}>{quotation.quotationId} - {quotation.projectTitle} - {getClientName(quotation)}</option>)}
        </select>
      </label>
      {selected ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <div className="flex flex-col justify-between gap-3 md:flex-row">
              <div>
                <h2 className="text-2xl font-black">{selected.projectTitle}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selected.quotationId} · {getClientName(selected)} · {formatDate(selected.submittedAt)}</p>
              </div>
              <StatusBadge status={selected.priorityLevel} />
            </div>
            <div className="mt-5 rounded-xl bg-surface p-4 text-sm leading-6 text-slate-600">
              <p>{selected.projectDescription}</p>
              <p className="mt-2"><strong>Services:</strong> {serviceNames(selected)}</p>
            </div>
            {!!selected.costingItems?.length && (
              <div className="mobile-table mt-5 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-3">Main Service</th>
                      <th className="p-3">Sub-Service</th>
                      <th className="p-3">Base</th>
                      <th className="p-3">Discount</th>
                      <th className="p-3">GST</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Added By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.costingItems.map((item, index) => (
                      <tr key={`${item.subService}-${index}`} className="border-t border-line">
                        <td className="p-3 font-semibold">
                          {item.mainService || '-'}
                          {!(selected.mainService || []).includes(item.mainService) && <span className="ml-2 rounded-full bg-purple/10 px-2 py-0.5 text-xs font-bold text-purple">Added by accountant</span>}
                        </td>
                        <td className="p-3">{item.subService || item.subServiceName || '-'}</td>
                        <td className="p-3">{currency(item.basePrice)}</td>
                        <td className="p-3">{item.discountPercentage || 0}%</td>
                        <td className="p-3">{currency(item.gstAmount)}</td>
                        <td className="p-3 font-bold">{currency(item.totalAmount)}</td>
                        <td className="p-3"><StatusBadge status={item.priceType || 'Manual'} /></td>
                        <td className="p-3">{item.addedByAccountantName || 'Accountant'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <AmountSummaryCard subtotal={pricing.finalSubtotal} gst={pricing.gst} originalSubtotal={pricing.baseSubtotal} discount={pricing.discountedAmount} />
        </div>
      ) : (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">No quotations are waiting for admin approval.</p>
      )}
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-premium">
        <h2 className="text-xl font-black">Decision Section</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-bold text-slate-600">Admin Final Discount
            <select value={discount.type} onChange={(event) => setDiscount((current) => ({ ...current, type: event.target.value, value: event.target.value === 'None' ? '' : current.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple">
              <option value="None">No discount</option>
              <option value="Percentage">Percentage</option>
              <option value="Fixed Amount">Fixed Amount</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-600">Discount Value
            <input type="number" min={0} max={discount.type === 'Percentage' ? 100 : undefined} disabled={discount.type === 'None'} value={discount.value} onChange={(event) => setDiscount((current) => ({ ...current, value: event.target.value }))} className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple disabled:bg-slate-50" placeholder={discount.type === 'Percentage' ? 'Enter %' : 'Enter amount'} />
          </label>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl bg-surface p-4 text-sm md:grid-cols-4">
          <div><p className="text-xs font-bold uppercase text-slate-400">Base</p><strong>{currency(pricing.baseSubtotal)}</strong></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Discount</p><strong className="text-emerald-600">-{currency(pricing.discountedAmount)}</strong></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">GST</p><strong>{currency(pricing.gst)}</strong></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Final Total</p><strong className="text-purple">{currency(pricing.finalSubtotal + pricing.gst)}</strong></div>
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-600">Remarks for Accountant <span className="font-semibold text-slate-400">(not visible to client)</span>
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-line px-4 py-3 outline-purple" placeholder="Notes for the accountant team..." />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={!selected} onClick={() => setModal('Approve Quotation')} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Approve</button>
          <button disabled={!selected} onClick={() => setModal('Reject Quotation')} className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-50">Reject</button>
        </div>
      </div>
      <ConfirmModal open={!!modal} title={modal} message="This action updates the workflow status and creates an audit log." onCancel={() => setModal(null)} onConfirm={decide} />
    </div>
  );
}
