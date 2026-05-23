import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import QuotationTimeline from '../components/QuotationTimeline.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { downloadPdf } from '../api.js';
import { currency, formatDate, getClientName, recordId } from '../utils/format.js';
import priceMap from '../utils/priceList.js';

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

  const selectedServices = useMemo(() => {
    if (!quotation) return [];
    const mains = quotation.mainService || [];
    const subs = quotation.subServices || [];
    const oldServices = quotation.servicesSelected || [];
    return [...mains, ...subs, ...oldServices.map(s => s?.name || s)].filter(Boolean);
  }, [quotation]);
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

  const handleDownload = async () => {
    if (role === 'Client') return;
    try {
      const { data } = await api.get(`/invoices?quotationId=${recordId(quotation)}`);
      if (data && data.length > 0) {
        await downloadPdf(recordId(data[0]), data[0].invoiceId);
      } else {
        alert('Invoice not found for this quotation.');
      }
    } catch (err) {
      alert('Unable to fetch invoice details.');
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
            <div className="mt-4 flex flex-wrap gap-2">{selectedServices.map((item) => {
          const key = typeof item === 'object' ? (item._id || item.id || item.name) : item;
          return <StatusBadge key={key} status={item.name || item} />;
        })}</div>
            <div className="mt-5 space-y-3 rounded-xl bg-surface p-4 text-sm leading-6 text-slate-600">
              <p>{quotation.projectDescription}</p>
              <p><strong>Main Service:</strong> {(quotation.mainService || []).join(', ') || '-'}</p>
              <p><strong>Sub-Services:</strong> {(quotation.subServices || []).join(', ') || '-'}</p>
              {quotation.requirementDetails && <p><strong>Requirement:</strong> <span className="whitespace-pre-wrap">{quotation.requirementDetails}</span></p>}
              {quotation.serviceRequirement && <p><strong>Service Requirement:</strong> {quotation.serviceRequirement}</p>}
              {quotation.technologyPreference && <p><strong>Technology:</strong> {quotation.technologyPreference}</p>}
              <p><strong>Priority:</strong> {quotation.priorityLevel || '-'}</p>
              <p><strong>Attachments:</strong> {quotation.attachments?.length ? quotation.attachments.map((file) => (
                <a key={file.url || file.filename} href={file.url} target="_blank" rel="noreferrer" className="ml-2 text-purple underline">{file.filename || 'Attachment'}</a>
              )) : '-'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Selected Sub-Services & Pricing</h2>
              {quotation.costingItems?.length ? (
                <div className="mobile-table mt-4 overflow-hidden rounded-xl border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="p-3">Main Service</th>
                        <th className="p-3">Sub-Service</th>
                        <th className="p-3">Base Price</th>
                        <th className="p-3">Discount</th>
                        <th className="p-3">GST</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Added By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.costingItems.map((item, index) => (
                        <tr key={`${item.subService}-${index}`} className="border-t border-line">
                          <td className="p-3 font-semibold">
                            {item.mainService || '-'}
                            {!(quotation.mainService || []).includes(item.mainService) && <span className="ml-2 rounded-full bg-purple/10 px-2 py-0.5 text-xs font-bold text-purple">Added by accountant</span>}
                          </td>
                          <td className="p-3">{item.subService || item.subServiceName || '-'}</td>
                          <td className="p-3">{currency(item.basePrice)}</td>
                          <td className="p-3">{item.discountPercentage || 0}%</td>
                          <td className="p-3">{currency(item.gstAmount)} ({item.gstPercentage || 0}%)</td>
                          <td className="p-3 font-bold">{currency(item.totalAmount)}</td>
                          <td className="p-3"><StatusBadge status={item.priceType || 'Manual'} /></td>
                          <td className="p-3">{item.addedByAccountantName || 'Accountant'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(quotation.subServices || []).length ? quotation.subServices.map((sub) => (
                    <span key={sub} className={`rounded-full border px-3 py-1 text-xs font-bold ${priceMap[sub] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      {sub}: {priceMap[sub] ? currency(priceMap[sub]) : 'Manual Price'}
                    </span>
                  )) : <span className="text-sm font-semibold text-slate-500">No sub-services selected yet.</span>}
                </div>
              )}
            </div>
          {role === 'Accountant' && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Admin Remarks</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{quotation.adminRemarks || 'No admin remarks yet.'}</p>
            </div>
          )}
          {role === 'Admin' && quotation.adminRemarks && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Remarks for Accountant</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{quotation.adminRemarks}</p>
            </div>
          )}
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
            <div className="mt-4">
              {role === 'Client' && ['Invoice Generated', 'Paid'].includes(quotation.status) ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Invoice has been sent to your registered email.</p>
              ) : ['Invoice Generated', 'Paid'].includes(quotation.status) ? (
                <PdfDownloadButton onClick={handleDownload} />
              ) : (
                <button disabled className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-slate-400 opacity-60">PDF Unavailable</button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
