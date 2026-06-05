import { useEffect, useMemo, useState } from 'react';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import api, { downloadPdf } from '../api.js';
import { currency, formatDate, getClientName, recordId } from '../utils/format.js';
import { enrichInvoiceItem } from '../utils/invoiceItems.js';

export default function InvoiceGeneration() {
  const [quotations, setQuotations] = useState([]);
  const [quotationId, setQuotationId] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [discount, setDiscount] = useState({ type: 'None', value: '' });
  const selectedQuotation = useMemo(() => quotations.find((item) => recordId(item) === quotationId), [quotations, quotationId]);
  const pricing = useMemo(() => {
    const baseSubtotal = Number(invoice?.subtotal || selectedQuotation?.subtotal || 0);
    const currentType = invoice?.discountType || discount.type;
    const currentValue = Number(invoice?.discountValue ?? discount.value ?? 0);
    const discountedAmount = invoice?.discountedAmount ?? (
      currentType === 'Percentage'
        ? Math.min(baseSubtotal * Math.min(Math.max(currentValue, 0), 100) / 100, baseSubtotal)
        : currentType === 'Fixed Amount'
          ? Math.min(Math.max(currentValue, 0), baseSubtotal)
          : 0
    );
    const finalSubtotal = invoice?.finalSubtotal ?? Math.max(baseSubtotal - discountedAmount, 0);
    const sourceGst = Number(selectedQuotation?.gstAmount || invoice?.gstAmount || 0);
    const gstRate = baseSubtotal ? sourceGst / baseSubtotal : 0;
    const gst = invoice?.gstAmount ?? finalSubtotal * gstRate;
    return { baseSubtotal, discountedAmount, finalSubtotal, gst };
  }, [invoice, selectedQuotation, discount]);

  useEffect(() => {
    api.get('/quotations')
      .then(({ data }) => {
        // Show Approved, Invoice Generated, and Paid — matches the backend's allowed statuses
        const eligible = data.filter((item) => ['Approved', 'Invoice Generated', 'Paid'].includes(item.status));
        setQuotations(eligible);
        if (eligible[0]) setQuotationId(recordId(eligible[0]));
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load quotations.' }));
  }, []);

  // Auto-load existing invoice whenever quotation selection changes
  useEffect(() => {
    if (!selectedQuotation) { setInvoice(null); return; }
    setDiscount({
      type: selectedQuotation.finalDiscountType || 'None',
      value: selectedQuotation.finalDiscountValue ? String(selectedQuotation.finalDiscountValue) : ''
    });
    setInvoice(null);
    setLoadingInvoice(true);
    api.get(`/invoices?quotationId=${recordId(selectedQuotation)}`)
      .then(({ data }) => {
        const existing = Array.isArray(data) ? data[0] : data;
        if (existing && recordId(existing)) setInvoice(existing);
      })
      .catch(() => { /* No existing invoice — that's fine */ })
      .finally(() => setLoadingInvoice(false));
  }, [selectedQuotation?._id]);

  const generate = async () => {
    if (!quotationId) return;
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post(`/invoices/generate/${quotationId}`, {
        discountType: discount.type,
        discountValue: Number(discount.value || 0)
      });
      setInvoice(data);
      setMessage({ type: 'success', text: data.emailDeliveryStatus === 'Sent' ? 'Invoice generated & emailed successfully.' : 'Invoice generated. Email delivery is pending or skipped.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to generate invoice.' });
    }
  };

  const sendEmail = async () => {
    if (!invoice) return;
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.post(`/invoices/${recordId(invoice)}/send-email`);
      setInvoice(data.invoice);
      setMessage({ type: 'success', text: data.message || 'Invoice Sent Successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to send invoice email.' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workflow</p>
        <h1 className="text-3xl font-black">Invoice Generation</h1>
      </div>
      {message.text && (
        <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">

          {/* Invoice header */}
          <div className="flex flex-col justify-between gap-3 md:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Invoice number</p>
              {loadingInvoice
                ? <p className="mt-1 text-sm text-slate-400 animate-pulse">Loading invoice...</p>
                : <h2 className="text-2xl font-black">{invoice?.invoiceId || 'Ready after generation'}</h2>
              }
              {invoice && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    ✓ Invoice exists
                  </span>
                  {invoice.emailDeliveryStatus && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border ${
                      invoice.emailDeliveryStatus === 'Sent'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : invoice.emailDeliveryStatus === 'Failed'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      Email: {invoice.emailDeliveryStatus}
                    </span>
                  )}
                </div>
              )}
            </div>
            {invoice && <PdfDownloadButton onClick={() => downloadPdf(recordId(invoice), invoice.invoiceId)} />}
          </div>

          {/* Quotation selector */}
          <label className="mt-6 block text-sm font-bold">
            Approved / Invoice Generated / Paid quotation
            <select
              value={quotationId}
              onChange={(event) => { setQuotationId(event.target.value); setInvoice(null); }}
              className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple"
            >
              <option value="">Select quotation</option>
              {quotations.map((quotation) => (
                <option key={recordId(quotation)} value={recordId(quotation)}>
                  {quotation.quotationId} - {quotation.projectTitle} - {getClientName(quotation)}
                  {quotation.status === 'Invoice Generated' ? ' [Invoice Generated]' : quotation.status === 'Paid' ? ' [Paid]' : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Discount */}
          <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold text-slate-600">Discount Type
                <select
                  value={discount.type}
                  disabled={!!invoice}
                  onChange={(event) => setDiscount((current) => ({ ...current, type: event.target.value, value: event.target.value === 'None' ? '' : current.value }))}
                  className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-purple disabled:bg-slate-50"
                >
                  <option value="None">No discount</option>
                  <option value="Percentage">Percentage</option>
                  <option value="Fixed Amount">Fixed Amount</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-600">Discount Value
                <input
                  type="number" min={0}
                  max={discount.type === 'Percentage' ? 100 : undefined}
                  disabled={!!invoice || discount.type === 'None'}
                  value={discount.value}
                  onChange={(event) => setDiscount((current) => ({ ...current, value: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 outline-purple disabled:bg-slate-50"
                  placeholder={discount.type === 'Percentage' ? 'Enter %' : 'Enter amount'}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <div><p className="text-xs font-bold uppercase text-slate-400">Base</p><strong>{currency(pricing.baseSubtotal)}</strong></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Discount</p><strong className="text-emerald-600">-{currency(pricing.discountedAmount)}</strong></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">GST</p><strong>{currency(pricing.gst)}</strong></div>
              <div><p className="text-xs font-bold uppercase text-slate-400">Final Total</p><strong className="text-purple">{currency(pricing.finalSubtotal + pricing.gst)}</strong></div>
            </div>
          </div>

          {/* Details */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-line px-4 py-3" value={invoice ? getClientName(invoice) : getClientName(selectedQuotation)} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={selectedQuotation?.quotationId || ''} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={formatDate(invoice?.invoiceDate)} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={formatDate(invoice?.dueDate)} readOnly />
          </div>

          {/* Line items table */}
          <div className="mt-6 mobile-table overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">S.No</th><th className="p-3">Service</th><th className="p-3">SAC</th>
                  <th className="p-3">Qty</th><th className="p-3">Taxable</th><th className="p-3">CGST</th>
                  <th className="p-3">SGST</th><th className="p-3">IGST</th><th className="p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice?.items || []).map((row, index) => {
                  const line = enrichInvoiceItem(row);
                  return (
                    <tr key={`${line.service}-${index}`} className="border-t border-line">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-semibold">{line.service}</td>
                      <td className="p-3">{line.sacCode}</td>
                      <td className="p-3">{line.quantity}</td>
                      <td className="p-3">{currency(line.taxableValue)}</td>
                      <td className="p-3">{currency(line.cgstAmount)}</td>
                      <td className="p-3">{currency(line.sgstAmount)}</td>
                      <td className="p-3">{currency(line.igstAmount)}</td>
                      <td className="p-3 font-bold">{currency(line.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!invoice?.items?.length && !loadingInvoice && (
              <p className="p-4 text-sm font-semibold text-slate-500">
                {invoice ? 'No line items found.' : 'Generate an invoice to view line items.'}
              </p>
            )}
            {loadingInvoice && <p className="p-4 text-sm text-slate-400 animate-pulse">Checking for existing invoice…</p>}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={generate}
              disabled={!quotationId || loadingInvoice}
              className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50"
            >
              {invoice ? '↺ Regenerate Invoice' : 'Generate Invoice'}
            </button>
            <button
              onClick={sendEmail}
              disabled={!invoice || loadingInvoice}
              className="rounded-xl border border-line px-5 py-3 font-bold disabled:opacity-50 hover:bg-slate-50 transition"
            >
              {invoice?.emailDeliveryStatus === 'Sent' ? '✉ Resend invoice email' : '✉ Send invoice email'}
            </button>
          </div>
        </section>
        <AmountSummaryCard
          subtotal={pricing.finalSubtotal}
          gst={pricing.gst}
          paid={invoice?.amountPaid || 0}
          originalSubtotal={pricing.baseSubtotal}
          discount={pricing.discountedAmount}
        />
      </div>
    </div>
  );
}
