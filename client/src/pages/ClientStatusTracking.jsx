import { useEffect, useState } from 'react';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, recordId } from '../utils/format.js';

const trackingStages = ['Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Rejected', 'Invoice Generated', 'Paid'];

export default function ClientStatusTracking() {
  const [quotations, setQuotations] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/quotations')
      .then(({ data }) => setQuotations(data))
      .catch((err) => setMessage(err.response?.data?.message || 'Unable to load quotation tracking.'));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Client Progress</p>
        <h1 className="text-3xl font-black">Quotation Status Tracking</h1>
      </div>
      {message && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{message}</p>}
      <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-black">Workflow Timeline</h2>
            <p className="mt-1 text-sm text-slate-500">Track each quotation from submission through invoice and payment.</p>
          </div>
          <span className="rounded-full bg-purple/10 px-3 py-1 text-xs font-bold text-purple">{quotations.length} quotations</span>
        </div>
        <div className="space-y-4">
          {quotations.map((quotation) => {
            const currentIndex = Math.max(0, trackingStages.indexOf(quotation.status));
            const assignedAccountant = quotation.costingItems?.find((item) => item.addedByAccountantName)?.addedByAccountantName || 'Pending assignment';
            return (
              <div key={recordId(quotation)} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h3 className="font-black text-slate-900">{quotation.projectTitle}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{quotation.quotationId} · Last updated {formatDate(quotation.updatedAt || quotation.submittedAt)}</p>
                    <p className="mt-1 text-sm text-slate-500">Assigned accountant/admin: {assignedAccountant}</p>
                  </div>
                  <StatusBadge status={quotation.status} />
                </div>
                <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
                  {trackingStages.map((stage, index) => {
                    const complete = index <= currentIndex && quotation.status !== 'Rejected';
                    const active = stage === quotation.status;
                    return (
                      <div key={stage} className={`rounded-xl border p-3 ${active ? 'border-purple bg-purple/10' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-line bg-white'}`}>
                        <div className={`mb-2 h-2 rounded-full ${active ? 'bg-purple' : complete ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        <p className={`text-xs font-bold ${active ? 'text-purple' : complete ? 'text-emerald-700' : 'text-slate-400'}`}>{stage}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!quotations.length && <p className="rounded-xl border border-dashed border-line p-5 text-sm font-semibold text-slate-500">No quotations available for tracking.</p>}
        </div>
      </section>
    </div>
  );
}
