import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, MessageCircle, ReceiptText } from 'lucide-react';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import EditQuotationModal from '../components/EditQuotationModal.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import QuotationTimeline from '../components/QuotationTimeline.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { downloadInvoiceForQuotation, downloadPdf, downloadQuotationPdf } from '../api.js';
import { currency, formatDate, getClientName, recordId } from '../utils/format.js';
import priceMap from '../utils/priceList.js';
import { getSacCode } from '../utils/sacCodes.js';

export default function QuotationDetail({ role, mode }) {
  const { id } = useParams();
  const [quotation, setQuotation] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [remark, setRemark] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

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

  const handleSendWhatsApp = async (target = 'client') => {
    if (!quotation) return;
    setSendingWhatsApp(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post(`/quotations/${recordId(quotation)}/send-whatsapp`, { target });
      if (data.success) {
        setMessage({
          type: 'success',
          text: target === 'management'
            ? `Quotation PDF dispatched to Management WhatsApp (${data.result?.successCount || 4}/${data.result?.totalCount || 4} members delivered)!`
            : `Quotation PDF sent directly to client WhatsApp (+${data.result?.contact || quotation.clientId?.phone})!`
        });
      } else {
        const errDetail = typeof data.result?.error === 'string'
          ? data.result.error
          : (data.result?.error?.ErrorMessage?.error?.message || data.result?.error?.ApiMessage || data.message || 'Check Tendigit credentials in server/.env');
        setMessage({ type: 'error', text: `WhatsApp delivery: ${errDetail}` });
      }
      if (data.quotation) {
        setQuotation(data.quotation);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to send WhatsApp message.' });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleApprove = async () => {
    if (!quotation) return;
    if (!window.confirm('Approve this quotation and automatically send the PDF to the client via WhatsApp?')) return;
    setSendingWhatsApp(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post(`/quotations/${recordId(quotation)}/approve`, {
        adminRemarks: 'Approved by Admin following management review'
      });
      setQuotation(data);
      if (data.whatsapp?.success) {
        setMessage({
          type: 'success',
          text: `Quotation approved and automatically sent to client WhatsApp (+${data.whatsapp.contact})!`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Quotation approved successfully! (Client WhatsApp delivery: ${data.whatsapp?.error || 'Pending delivery'})`
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Approval failed.' });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleDownload = async () => {
    if (role === 'Client') return;
    if (quotation?.invoice?._id) {
      await downloadPdf(recordId(quotation.invoice), quotation.invoice.invoiceId || 'Invoice');
      return;
    }
    await downloadInvoiceForQuotation(recordId(quotation), quotation.quotationId);
  };

  const handleDownloadQuotation = async () => {
    if (!quotation) return;
    await downloadQuotationPdf(recordId(quotation), quotation.quotationId || 'Quotation');
  };

  if (!quotation && !message.text) return <p className="rounded-xl bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">Loading quotation...</p>;
  if (!quotation) return <p className="rounded-xl bg-red-50 p-5 text-sm font-semibold text-red-600">{message.text}</p>;

  return (
    <>
    <div>
      {message.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Quotation View</p>
          <h1 className="text-3xl font-black">{quotation.projectTitle}</h1>
          <p className="mt-1 text-slate-500">{quotation.quotationId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {['Accountant', 'Admin'].includes(role) && (
            <>
              <button
                type="button"
                onClick={handleDownloadQuotation}
                className="flex items-center gap-1.5 rounded-xl bg-purple px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple/90 transition-all"
                title="Download Quotation PDF at anytime"
              >
                <Download size={15} />
                <span>Quotation PDF</span>
              </button>
              {(quotation.invoice || ['Invoice Generated', 'Paid'].includes(quotation.status)) && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition-all"
                  title="Download Invoice PDF at anytime"
                >
                  <ReceiptText size={15} />
                  <span>Invoice PDF</span>
                </button>
              )}
              {/* Management WhatsApp Dispatch */}
              <button
                type="button"
                onClick={() => handleSendWhatsApp('management')}
                disabled={sendingWhatsApp}
                className="flex items-center gap-1.5 rounded-xl border border-purple/30 bg-purple/10 px-3.5 py-2 text-xs font-bold text-purple hover:bg-purple hover:text-white disabled:opacity-50 transition-all shadow-sm"
                title="Send quotation PDF to Management (MD, ED, CEO, Bit Byte Office)"
              >
                <MessageCircle size={15} />
                <span>{sendingWhatsApp ? 'Sending...' : '📱 Send to Management'}</span>
              </button>

              {/* Client WhatsApp Dispatch (or Manual Admin Approval) */}
              {quotation.status === 'Approved' || ['Invoice Generated', 'Paid'].includes(quotation.status) ? (
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp('client')}
                  disabled={sendingWhatsApp}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-all"
                  title="Resend quotation PDF directly to client's WhatsApp"
                >
                  <MessageCircle size={15} />
                  <span>{sendingWhatsApp ? 'Sending...' : (quotation.whatsappStatus === 'Sent' ? 'Resend to Client' : 'Send to Client WhatsApp')}</span>
                </button>
              ) : role === 'Admin' ? (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={sendingWhatsApp}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
                  title="Approve quotation and automatically dispatch to client's WhatsApp"
                >
                  <CheckCircle2 size={15} />
                  <span>{sendingWhatsApp ? 'Approving...' : '✅ Approve & Send to Client'}</span>
                </button>
              ) : null}
            </>
          )}
          {['Admin', 'Accountant'].includes(role) && (() => {
            const editCount = quotation.adminEditCount || 0;
            const editsLeft = 2 - editCount;
            return editsLeft > 0 ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2 font-bold"
              >
                ✏️ Edit Quotation
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black">
                  {editsLeft} left
                </span>
              </button>
            ) : (
              <span className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                🔒 Max edits used (2/2)
              </span>
            );
          })()}
          <StatusBadge status={quotation.status} />
        </div>
      </div>
      {/* Management Review Notice Banner if pending approval */}
      {quotation.status !== 'Approved' && !['Invoice Generated', 'Paid'].includes(quotation.status) && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-700 mt-0.5">
              <MessageCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-800">Management Approval Flow</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                Quotation is dispatched to Management members: <strong>MD (+91 8248654541)</strong> · <strong>ED (+91 9789274743)</strong> · <strong>CEO (+91 94443 77000)</strong> · <strong>Bit Byte Office (9943743136)</strong>.
              </p>
              <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                After management review, Admin can enter manual approval above to automatically dispatch the quotation to the client's WhatsApp.
              </p>
            </div>
          </div>
          {role === 'Admin' && (
            <button
              onClick={handleApprove}
              disabled={sendingWhatsApp}
              className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow hover:bg-emerald-700 transition"
            >
              <CheckCircle2 size={15} /> Approve & Send to Client
            </button>
          )}
        </div>
      )}

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
                ['Management WhatsApp', quotation.managementWhatsAppStatus === 'Sent' ? '✅ Sent (MD, ED, CEO, Office)' : quotation.managementWhatsAppStatus === 'Partial' ? '⚠️ Partial Delivery' : quotation.managementWhatsAppStatus === 'Failed' ? '❌ Failed' : '⏳ Pending Management Send'],
                ['Client WhatsApp', quotation.whatsappStatus === 'Sent' ? `✅ Sent (+${quotation.whatsappRecipient || quotation.clientId?.phone})` : quotation.whatsappStatus === 'Failed' ? '❌ Failed' : (quotation.status === 'Approved' ? '⏳ Ready to Send' : '⏳ Awaiting Admin Approval')],
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
                        <th className="p-3">SAC</th>
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
                          <td className="p-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{item.subService || item.subServiceName || '-'}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black border ${
                                (item.frequency === 'Monthly' || item.payable === 'Monthly' || item.frequency === 'Weekly' || (item.description || '').includes('Monthly'))
                                  ? 'bg-purple/10 text-purple border-purple/20'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {(item.frequency === 'Monthly' || item.payable === 'Monthly' || (item.description || '').includes('Monthly')) ? '🔄 Monthly Recurring' : item.frequency === 'Weekly' ? '🔄 Weekly' : '⚡ One Time'}
                              </span>
                              {(item.isComplimentary || item.tier === 'Complimentary' || (item.totalAmount === 0 && (item.description || '').toLowerCase().includes('complimentary')) || (Number(item.basePrice || 0) === 0 && Number(item.totalAmount || 0) === 0)) && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
                                  🎁 Complimentary
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">{item.sacCode || getSacCode(item.subService || item.subServiceName)}</td>
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
          {/* Payment Milestones (Terms & Conditions) Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black text-slate-950">Payment Milestones</h2>
            <p className="mt-1 text-xs text-slate-500">Milestone schedule as per Terms & Conditions</p>
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-purple/5 border border-purple/20 p-3">
                <div>
                  <p className="text-xs font-bold uppercase text-purple">Stage 1 · 70%</p>
                  <p className="text-sm font-black text-slate-900">Initial Payment</p>
                </div>
                <p className="text-base font-black text-purple">{currency(Math.round((quotation.totalAmount || quotation.finalTotal || (subtotal + gst)) * 0.70))}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Stage 2 · 15%</p>
                  <p className="text-sm font-black text-slate-900">Client Checking Handover</p>
                </div>
                <p className="text-base font-black text-slate-800">{currency(Math.round((quotation.totalAmount || quotation.finalTotal || (subtotal + gst)) * 0.15))}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Stage 3 · 15%</p>
                  <p className="text-sm font-black text-slate-900">Final Handover</p>
                </div>
                <p className="text-base font-black text-slate-800">{currency(Math.max(0, (quotation.totalAmount || quotation.finalTotal || (subtotal + gst)) - Math.round((quotation.totalAmount || quotation.finalTotal || (subtotal + gst)) * 0.70) - Math.round((quotation.totalAmount || quotation.finalTotal || (subtotal + gst)) * 0.15)))}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="mb-4 text-lg font-black">Status Timeline</h2>
            <QuotationTimeline status={quotation.status} />
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Quotation Document</h2>
            <p className="mt-2 text-sm text-slate-500">Official quotation document is available to download at anytime.</p>
            <div className="mt-4">
              {['Accountant', 'Admin'].includes(role) ? (
                <PdfDownloadButton label="Download Quotation PDF" onClick={handleDownloadQuotation} />
              ) : (
                <a
                  href={`/public/quotation/${recordId(quotation)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple hover:bg-purple/5"
                >
                  <Download size={16} /> View Online
                </a>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Invoice Document</h2>
            <p className="mt-2 text-sm text-slate-500">
              {(quotation.invoice || ['Invoice Generated', 'Paid'].includes(quotation.status))
                ? 'Official invoice is available for download at anytime.'
                : 'Available after quotation approval and invoice generation.'}
            </p>
            <div className="mt-4">
              {role === 'Client' && ['Invoice Generated', 'Paid'].includes(quotation.status) ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Invoice has been sent to your registered email.</p>
              ) : (quotation.invoice || ['Invoice Generated', 'Paid'].includes(quotation.status)) ? (
                <PdfDownloadButton label="Download Invoice PDF" onClick={handleDownload} />
              ) : (
                <button disabled className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-slate-400 opacity-60 cursor-not-allowed">
                  <ReceiptText size={16} /> Invoice Not Generated
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
      {showEditModal && quotation && (
        <EditQuotationModal
          quotation={quotation}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setQuotation(updated);
            setShowEditModal(false);
            setMessage({ type: 'success', text: `Quotation updated successfully. (Edit ${updated.adminEditCount}/2)` });
          }}
        />
      )}
    </>
  );
}
