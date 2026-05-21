import { useEffect, useMemo, useState } from 'react';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PricingTable from '../components/PricingTable.jsx';
import api from '../api.js';
import { getClientName, recordId } from '../utils/format.js';

export default function PricingPage() {
  const [quotations, setQuotations] = useState([]);
  const [services, setServices] = useState([]);
  const [quotationId, setQuotationId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [rows, setRows] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/quotations'), api.get('/services')])
      .then(([quotationRes, serviceRes]) => {
        const actionable = quotationRes.data.filter((item) => ['Submitted', 'Under Review', 'Needs Clarification'].includes(item.status));
        setQuotations(actionable);
        setServices(serviceRes.data.filter((service) => service.status === 'Active'));
        if (actionable[0]) setQuotationId(recordId(actionable[0]));
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load pricing workspace.' }));
  }, []);

  useEffect(() => {
    const current = quotations.find((item) => recordId(item) === quotationId);
    if (!current) {
      setRows([]);
      return;
    }
    const nextRows = (current.servicesSelected || []).map((service) => ({
      serviceId: recordId(service),
      description: '',
      estimatedCost: service.basePrice || '',
      gstPercentage: 18
    }));
    setRows(nextRows.length ? nextRows : [{ serviceId: services[0]?._id || '', description: '', estimatedCost: '', gstPercentage: 18 }]);
  }, [quotationId, quotations, services]);

  const subtotal = useMemo(() => rows.reduce((sum, row) => sum + Number(row.estimatedCost || 0), 0), [rows]);
  const gst = useMemo(() => rows.reduce((sum, row) => sum + Number(row.estimatedCost || 0) * Number(row.gstPercentage || 0) / 100, 0), [rows]);
  const selectedQuotation = quotations.find((item) => recordId(item) === quotationId);

  const saveCosting = async (forward = false) => {
    if (!quotationId || !rows.length) return;
    try {
      await api.post(`/quotations/${quotationId}/costing`, {
        accountantRemarks: remarks,
        items: rows.map((row) => ({
          serviceId: row.serviceId,
          description: row.description,
          estimatedCost: Number(row.estimatedCost || 0),
          gstPercentage: Number(row.gstPercentage || 0)
        }))
      });
      if (forward) await api.post(`/quotations/${quotationId}/forward-to-admin`);
      setMessage({ type: 'success', text: forward ? 'Costing saved and forwarded to admin.' : 'Costing saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to save costing.' });
    }
  };

  const requestClarification = async () => {
    if (!quotationId || !remarks.trim()) return;
    try {
      await api.post(`/quotations/${quotationId}/clarification`, { message: remarks });
      setMessage({ type: 'success', text: 'Clarification request submitted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to submit clarification.' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Accountant Workflow</p>
        <h1 className="text-3xl font-black">Add Pricing & Costing</h1>
      </div>
      {message.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}
      <div className="mb-5 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <label className="text-sm font-bold">Quotation
          <select value={quotationId} onChange={(event) => setQuotationId(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 outline-purple">
            <option value="">Select quotation</option>
            {quotations.map((quotation) => <option key={recordId(quotation)} value={recordId(quotation)}>{quotation.quotationId} - {quotation.projectTitle} - {getClientName(quotation)}</option>)}
          </select>
        </label>
        {selectedQuotation && (
          <div className="mt-3 text-sm font-semibold text-slate-500">
            <p>{selectedQuotation.projectDescription}</p>
            <p className="mt-2 text-slate-800">Requested Services:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[...(selectedQuotation.mainService || []), ...(selectedQuotation.subServices || []), ...(selectedQuotation.servicesSelected || []).map(s => s.name || s)].filter(Boolean).map(s => (
                <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">{s}</span>
              ))}
            </div>
            {selectedQuotation.requirementDetails && <p className="mt-3 whitespace-pre-wrap">{selectedQuotation.requirementDetails}</p>}
          </div>
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section>
          <PricingTable rows={rows} setRows={setRows} services={services} />
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-5 min-h-28 w-full rounded-2xl border border-line bg-white p-4 shadow-sm outline-purple" placeholder="Remarks visible to client..." />
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => saveCosting(false)} disabled={!quotationId || !rows.length} className="rounded-xl border border-line bg-white px-5 py-3 font-bold disabled:opacity-50">Save Costing</button>
            <button onClick={requestClarification} disabled={!quotationId || !remarks.trim()} className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 font-bold text-orange-700 disabled:opacity-50">Submit for Clarification</button>
            <button onClick={() => saveCosting(true)} disabled={!quotationId || !rows.length} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Forward to Admin</button>
          </div>
        </section>
        <AmountSummaryCard subtotal={subtotal} gst={gst} />
      </div>
    </div>
  );
}
