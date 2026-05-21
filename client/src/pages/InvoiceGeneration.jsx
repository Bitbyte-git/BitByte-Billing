import { useEffect, useMemo, useState } from 'react';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import api from '../api.js';
import { currency, formatDate, getClientName, recordId } from '../utils/format.js';

export default function InvoiceGeneration() {
  const [quotations, setQuotations] = useState([]);
  const [quotationId, setQuotationId] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const selectedQuotation = useMemo(() => quotations.find((item) => recordId(item) === quotationId), [quotations, quotationId]);
  const subtotal = invoice?.subtotal || selectedQuotation?.subtotal || 0;
  const gst = invoice?.gstAmount || selectedQuotation?.gstAmount || 0;

  useEffect(() => {
    api.get('/quotations')
      .then(({ data }) => {
        const approved = data.filter((item) => item.status === 'Approved');
        setQuotations(approved);
        if (approved[0]) setQuotationId(recordId(approved[0]));
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load approved quotations.' }));
  }, []);

  const generate = async () => {
    if (!quotationId) return;
    try {
      const { data } = await api.post(`/invoices/generate/${quotationId}`);
      setInvoice(data);
      setMessage({ type: 'success', text: 'Invoice generated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to generate invoice.' });
    }
  };

  const sendEmail = async () => {
    if (!invoice) return;
    try {
      await api.post(`/invoices/${recordId(invoice)}/send-email`);
      setMessage({ type: 'success', text: 'Invoice email queued.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to queue invoice email.' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workflow</p>
        <h1 className="text-3xl font-black">Invoice Generation</h1>
      </div>
      {message.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
          <div className="flex flex-col justify-between gap-3 md:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Invoice number</p>
              <h2 className="text-2xl font-black">{invoice?.invoiceId || 'Ready after generation'}</h2>
            </div>
            <PdfDownloadButton />
          </div>
          <label className="mt-6 block text-sm font-bold">Approved quotation
            <select value={quotationId} onChange={(event) => { setQuotationId(event.target.value); setInvoice(null); }} className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple">
              <option value="">Select approved quotation</option>
              {quotations.map((quotation) => <option key={recordId(quotation)} value={recordId(quotation)}>{quotation.quotationId} - {quotation.projectTitle} - {getClientName(quotation)}</option>)}
            </select>
          </label>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-line px-4 py-3" value={invoice ? getClientName(invoice) : getClientName(selectedQuotation)} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={selectedQuotation?.quotationId || ''} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={formatDate(invoice?.invoiceDate)} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={formatDate(invoice?.dueDate)} readOnly />
          </div>
          <div className="mt-6 rounded-2xl border border-line">
            <div className="grid grid-cols-4 border-b border-line bg-slate-50 p-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Service</span><span>Description</span><span>GST</span><span>Total</span>
            </div>
            {(invoice?.items || []).map((row) => <div key={`${row.service}-${row.description}`} className="grid grid-cols-4 p-3 text-sm"><span>{row.service}</span><span>{row.description}</span><span>{row.gstPercentage}%</span><strong>{currency(row.total)}</strong></div>)}
            {!invoice?.items?.length && <p className="p-4 text-sm font-semibold text-slate-500">Generate an invoice to view line items.</p>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={generate} disabled={!quotationId} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Generate Invoice</button>
            <button onClick={sendEmail} disabled={!invoice} className="rounded-xl border border-line px-5 py-3 font-bold disabled:opacity-50">Send invoice email</button>
          </div>
        </section>
        <AmountSummaryCard subtotal={subtotal} gst={gst} paid={0} />
      </div>
    </div>
  );
}
