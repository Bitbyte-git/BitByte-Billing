import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PdfDownloadButton from '../components/PdfDownloadButton.jsx';
import { currency } from '../utils/constants.js';
import { quotationsAPI, invoicesAPI } from '../api.js';

export default function InvoiceGeneration() {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    quotationsAPI.get(quotationId).then(data => {
      setQuotation(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [quotationId]);

  if (loading) return <div className="p-8 text-center">Loading quotation data...</div>;
  if (!quotation) return <div className="p-8 text-center text-red-500">Quotation not found.</div>;

  const subtotal = quotation.servicesSelected?.reduce((sum, s) => sum + (s.estimatedCost || 0), 0) || 0;
  const gst = subtotal * 0.18; // standard 18% gst assumption

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await invoicesAPI.generate(quotationId);
      navigate('/admin/invoices');
    } catch (err) {
      console.error(err);
      alert('Failed to generate invoice.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workflow</p>
        <h1 className="text-3xl font-black">Invoice Generation</h1>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
          <div className="flex flex-col justify-between gap-3 md:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quotation Ref</p>
              <h2 className="text-2xl font-black">{quotation.quotationId}</h2>
            </div>
            <PdfDownloadButton />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-line px-4 py-3" value={quotation.clientId?.name || 'Unknown Client'} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={quotation.projectTitle || ''} readOnly />
            <input className="rounded-xl border border-line px-4 py-3" value={new Date().toLocaleDateString('en-CA')} readOnly title="Invoice Date" />
            <input className="rounded-xl border border-line px-4 py-3" value="Due in 15 days" readOnly />
          </div>
          <div className="mt-6 rounded-2xl border border-line">
            <div className="grid grid-cols-4 border-b border-line bg-slate-50 p-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Service</span><span>Description</span><span>GST</span><span>Total</span>
            </div>
            {(quotation.subServices?.length ? quotation.subServices : [quotation.mainService]).map((svc, idx) => {
               // mock cost for display since we didn't implement full pricing flow
               const baseCost = 25000;
               const rowGst = baseCost * 0.18;
               const total = baseCost + rowGst;
               return (
                 <div key={idx} className="grid grid-cols-4 p-3 text-sm border-b border-line last:border-0">
                   <span>{quotation.mainService}</span>
                   <span>{svc}</span>
                   <span>18%</span>
                   <strong>{currency(total)}</strong>
                 </div>
               );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={handleGenerate} disabled={generating} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate Invoice'}
            </button>
            <button className="rounded-xl border border-line px-5 py-3 font-bold">Cancel</button>
          </div>
        </section>
        <AmountSummaryCard subtotal={subtotal} gst={gst} paid={0} />
      </div>
    </div>
  );
}
