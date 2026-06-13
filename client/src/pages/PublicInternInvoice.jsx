import { BadgeCheck, CalendarDays, GraduationCap, Mail, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api.js';
import BrandLogo from '../components/BrandLogo.jsx';
import { COMPANY_NAME } from '../config/brand.js';
import { formatDate } from '../utils/format.js';

function maskEmail(email = '') {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return '-';
  return `${name.slice(0, 3)}***@${domain}`;
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-base font-black text-slate-950">{value || '-'}</p>
    </div>
  );
}

export default function PublicInternInvoice() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/intern-invoices/public/${encodeURIComponent(id)}`)
      .then(({ data }) => setRecord(data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to verify intern invoice.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        <div className="bg-slate-950 px-6 py-6 text-white md:px-8">
          <BrandLogo size="md" theme="dark" tagline={COMPANY_NAME} />
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Intern Invoice Verification</p>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Verified intern details</h1>
            </div>
            {record && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-200">
                <BadgeCheck size={18} /> {record.status}
              </span>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8">
          {loading && <p className="rounded-xl bg-white p-4 text-sm font-bold text-slate-500 shadow-sm">Loading verification details...</p>}
          {error && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p>}

          {record && !loading && !error && (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                  <UserRound className="text-cyan-700" size={22} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Intern</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{record.employeeName}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <GraduationCap className="text-emerald-700" size={22} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">College</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{record.collegeName}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                  <CalendarDays className="text-violet-700" size={22} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-violet-700">Invoice Date</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{formatDate(record.invoiceDate)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailCard label="Intern ID" value={record.internId} />
                <DetailCard label="Invoice ID" value={record.invoiceId} />
                <DetailCard label="Email ID" value={maskEmail(record.email)} />
                <DetailCard label="Department" value={record.department} />
                <DetailCard label="Position" value={record.position} />
                <DetailCard label="Duration" value={record.duration} />
                <DetailCard label="Passed Out" value={record.passedOut} />
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">
                <Mail className="mt-0.5 shrink-0 text-slate-400" size={18} />
                This public verification page intentionally hides payment information.
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
