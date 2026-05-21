import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import QuotationTimeline from '../components/QuotationTimeline.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import { formatDate, getClientName, recordId } from '../utils/format.js';

export default function QuotationDetail({ role, mode }) {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/quotations/${id}`)
      .then(({ data }) => setQuotation(data))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load quotation.' }));
  }, [id]);

  const selectedServices = useMemo(() => quotation?.servicesSelected || [], [quotation]);
  const subtotal = quotation?.subtotal || 0;
  const gst = quotation?.gstAmount || 0;

  const sendClarification = async () => {
    if (!remark.trim()) return;
    try {
      const { data } = await api.post(`/quotations/${recordId(quotation)}/clarification`, { message: remark });
      setQuotation(data);
      setRemark('');
      setMessage({ type: 'success', text: 'Clarification request sent.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to send clarification.' });
    }
  };

  if (!quotation && !message.text) return <p className="rounded-xl bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">Loading quotation...</p>;
  if (!quotation) return <p className="rounded-xl bg-red-50 p-5 text-sm font-semibold text-red-600">{message.text}</p>;

  return (
    <div>
      {message.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Quotation View</p>
          <h1 className="text-3xl font-black">{quotation.projectTitle}</h1>
          <p className="mt-1 text-slate-500">{quotation.quotationId}</p>
        </div>
        <StatusBadge status={quotation.status} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Client & Project Information</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                ['Client', quotation.clientId?.fullName || getClientName(quotation)],
                ['Company', quotation.clientId?.companyName || '-'],
                ['Email', quotation.clientId?.email || '-'],
                ['Phone', quotation.clientId?.phone || '-'],
                ['Priority', quotation.priorityLevel],
                ['Submitted', formatDate(quotation.submittedAt || quotation.createdAt)]
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-surface p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Quotation Summary</h2>
            <div className="mt-4 flex flex-wrap gap-2">{selectedServices.map((item) => <StatusBadge key={recordId(item)} status={item.name || item} />)}</div>
            <div className="mt-5 space-y-3 rounded-xl bg-surface p-4 text-sm leading-6 text-slate-600">
              <p>{quotation.projectDescription}</p>
              {quotation.serviceRequirement && <p><strong>Requirement:</strong> {quotation.serviceRequirement}</p>}
              {quotation.technologyPreference && <p><strong>Technology:</strong> {quotation.technologyPreference}</p>}
              {quotation.budgetRange && <p><strong>Budget:</strong> {quotation.budgetRange}</p>}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Accountant Remarks</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{quotation.accountantRemarks || 'No accountant remarks yet.'}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Admin Remarks</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{quotation.adminRemarks || 'No admin remarks yet.'}</p>
            </div>
          </div>
          {mode === 'clarification' && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Return for Clarification</h2>
              <textarea value={remark} onChange={(event) => setRemark(event.target.value)} className="mt-4 min-h-28 w-full rounded-xl border border-line px-4 py-3 outline-purple" placeholder="List clarification questions for the client..." />
              <button onClick={sendClarification} disabled={!remark.trim()} className="gradient-button mt-4 rounded-xl px-5 py-3 font-bold disabled:opacity-50">Send to Client</button>
            </div>
          )}
        </section>
        <aside className="space-y-6">
          <AmountSummaryCard subtotal={subtotal} gst={gst} paid={quotation.status === 'Paid' ? quotation.amount : 0} />
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="mb-4 text-lg font-black">Status Timeline</h2>
            <QuotationTimeline status={quotation.status} />
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Invoice Link</h2>
            <p className="mt-2 text-sm text-slate-500">Available after approval and invoice generation.</p>
            <div className="mt-4"><PdfDownloadButton /></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
