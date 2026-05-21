import { useEffect, useMemo, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import api from '../api.js';
import { formatDate, getClientName, recordId, serviceNames } from '../utils/format.js';

export default function AdminApproval() {
  const [modal, setModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [quotations, setQuotations] = useState([]);
  const [quotationId, setQuotationId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const selected = useMemo(() => quotations.find((item) => recordId(item) === quotationId), [quotations, quotationId]);

  const load = () => api.get('/quotations')
    .then(({ data }) => {
      const pending = data.filter((item) => item.status === 'Forwarded to Admin');
      setQuotations(pending);
      if (!quotationId && pending[0]) setQuotationId(recordId(pending[0]));
    })
    .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load approvals.' }));

  useEffect(() => { load(); }, []);

  const decide = async () => {
    if (!selected || !modal) return;
    try {
      const endpoint = modal === 'Approve Quotation' ? 'approve' : 'reject';
      await api.post(`/quotations/${recordId(selected)}/${endpoint}`, { adminRemarks: remarks });
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
              <p className="mt-2"><strong>Services:</strong> {serviceNames(selected.servicesSelected)}</p>
              <p className="mt-2"><strong>Accountant remarks:</strong> {selected.accountantRemarks || '-'}</p>
            </div>
          </section>
          <AmountSummaryCard subtotal={selected.subtotal} gst={selected.gstAmount} />
        </div>
      ) : (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">No quotations are waiting for admin approval.</p>
      )}
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-premium">
        <h2 className="text-xl font-black">Decision Section</h2>
        <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-line px-4 py-3 outline-purple" placeholder="Admin remarks..." />
        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={!selected} onClick={() => setModal('Approve Quotation')} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Approve</button>
          <button disabled={!selected} onClick={() => setModal('Reject Quotation')} className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-50">Reject</button>
        </div>
      </div>
      <ConfirmModal open={!!modal} title={modal} message="This action updates the workflow status and creates an audit log." onCancel={() => setModal(null)} onConfirm={decide} />
    </div>
  );
}
