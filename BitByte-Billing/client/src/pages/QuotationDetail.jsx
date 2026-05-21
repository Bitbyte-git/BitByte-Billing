import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import QuotationTimeline from '../components/QuotationTimeline.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency } from '../utils/constants.js';
import { quotationsAPI, invoicesAPI } from '../api.js';

export default function QuotationDetail({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    quotationsAPI.get(id).then(setQuotation).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8">Loading quotation details...</div>;
  if (!quotation) return <div className="p-8">Quotation not found.</div>;

  const subtotal = quotation.subtotal || 0;
  const gst = quotation.gstAmount || 0;

  const handleAdminAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'approve') await quotationsAPI.approve(id, remarks);
      if (action === 'reject') await quotationsAPI.reject(id, remarks);
      navigate('/admin/quotations');
    } catch (e) {
      console.error(e);
      alert('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateInvoice = () => {
    navigate(`/admin/invoices/generate/${id}`);
  };

  const handleAccountantAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'clarify') await quotationsAPI.requestClarification(id, remarks);
      if (action === 'forward') await quotationsAPI.forwardToAdmin(id);
      navigate('/accountant/quotations');
    } catch (e) {
      console.error(e);
      alert('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
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
                ['Client', quotation.clientId?.fullName],
                ['Company', quotation.clientId?.companyName],
                ['Email', quotation.clientId?.email],
                ['Phone', quotation.clientId?.phone],
                ['Priority', quotation.priorityLevel],
                ['Submitted', new Date(quotation.submittedAt).toLocaleDateString()]
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-surface p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Quotation Summary</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={quotation.mainService} />
              {quotation.subServices?.map((item, idx) => <StatusBadge key={idx} status={item} />)}
            </div>
            <p className="mt-5 rounded-xl bg-surface p-4 text-sm leading-6 text-slate-600">{quotation.requirementDetails || 'Requirement package includes service scope, references, preferred start date, budget range, technology preference, and uploaded attachments.'}</p>
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

          {/* Action Panels */}
          {role === 'Admin' && quotation.status === 'Forwarded to Admin' && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-xl font-black">Decision Section</h2>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-line px-4 py-3 outline-purple" placeholder="Admin remarks..." />
              <div className="mt-5 flex flex-wrap gap-3">
                <button disabled={actionLoading} onClick={() => handleAdminAction('approve')} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Approve Quotation</button>
                <button disabled={actionLoading} onClick={() => handleAdminAction('reject')} className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white disabled:opacity-50">Reject</button>
              </div>
            </div>
          )}

          {role === 'Admin' && quotation.status === 'Approved' && (
             <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-xl font-black">Invoice Generation</h2>
              <p className="mt-2 text-sm text-slate-600">This quotation has been approved. You can now generate the final invoice.</p>
              <button disabled={actionLoading} onClick={handleGenerateInvoice} className="gradient-button mt-4 rounded-xl px-5 py-3 font-bold disabled:opacity-50">Generate Invoice</button>
             </div>
          )}

          {role === 'Accountant' && (quotation.status === 'Submitted' || quotation.status === 'Needs Clarification') && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Accountant Review & Costing</h2>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="mt-4 min-h-28 w-full rounded-xl border border-line px-4 py-3 outline-purple" placeholder="Add clarification questions or internal remarks..." />
              <div className="mt-4 flex flex-wrap gap-3">
                <button disabled={actionLoading} onClick={() => handleAccountantAction('clarify')} className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 font-bold text-orange-700 disabled:opacity-50">Request Clarification</button>
                {quotation.subtotal > 0 && (
                  <button disabled={actionLoading} onClick={() => handleAccountantAction('forward')} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Forward to Admin</button>
                )}
              </div>
            </div>
          )}
        </section>
        <aside className="space-y-6">
          <AmountSummaryCard subtotal={subtotal} gst={gst} paid={quotation.status === 'Paid' ? quotation.totalAmount : 0} />
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="mb-4 text-lg font-black">Status Timeline</h2>
            <QuotationTimeline status={quotation.status} />
          </div>
          {(quotation.status === 'Invoice Generated' || quotation.status === 'Paid') && (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">Invoice Link</h2>
              <div className="mt-4"><PdfDownloadButton /></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
