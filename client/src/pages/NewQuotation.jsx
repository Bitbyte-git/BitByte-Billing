import { useMemo, useState } from 'react';
import { Paperclip, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import priceMap, { serviceCatalog } from '../utils/priceList.js';
import { currency } from '../utils/format.js';

const SERVICE_DATA = serviceCatalog;

export default function NewQuotation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [declared, setDeclared] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    mainService: [],
    subServices: [],
    projectTitle: '',
    requirementDetails: '',
    preferredStartDate: '',
    referenceLinks: '',
    priorityLevel: 'Medium'
  });

  const toggleMain = (srv) => {
    setForm(f => {
      const exists = f.mainService.includes(srv);
      let newMains = exists ? f.mainService.filter(x => x !== srv) : [...f.mainService, srv];
      let newSubs = f.subServices;
      if (exists) {
        // remove subs that belong to this main service
        const srvObj = SERVICE_DATA.find(s => s.name === srv);
        if (srvObj) {
          newSubs = newSubs.filter(sub => !srvObj.subs.includes(sub));
        }
      }
      return { ...f, mainService: newMains, subServices: newSubs };
    });
  };

  const toggleSub = (sub) => {
    setForm(f => ({
      ...f,
      subServices: f.subServices.includes(sub) ? f.subServices.filter(x => x !== sub) : [...f.subServices, sub]
    }));
  };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const canSubmit = useMemo(() => form.mainService.length > 0 && form.projectTitle && declared, [form, declared]);

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        ...form,
        confirmationAccepted: declared,
        referenceLinks: form.referenceLinks.split(',').map((item) => item.trim()).filter(Boolean)
      };
      console.log('Submitting payload', payload);
        await api.post('/quotations', payload);
      setMessage({ type: 'success', text: 'Quotation submitted successfully!' });
      setTimeout(() => navigate('/client/quotations'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to submit quotation.' });
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">Client Workflow</p>
        <h1 className="text-3xl font-black">New Quotation Request</h1>
      </div>
      <Stepper steps={['Service Selection', 'Requirement Form', 'Summary & Submit']} current={step} />
      {message.text && <p className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}

      {step === 1 && (
        <section>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {SERVICE_DATA.map((service) => {
              const isSelected = form.mainService.includes(service.name);
              return (
                <div key={service.name} className={`rounded-2xl border-2 p-5 transition-all ${isSelected ? 'border-purple bg-purple/5 shadow-md' : 'border-line bg-white hover:border-purple/30'}`}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-purple bg-purple' : 'border-slate-300'}`}>
                      {isSelected && <CheckCircle size={14} className="text-white" />}
                    </div>
                    <span className="font-bold text-slate-900">{service.name}</span>
                    <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleMain(service.name)} />
                  </label>
                  
                  {isSelected && service.subs.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 pl-8">
                      {service.subs.map(sub => (
                        <label key={sub} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={form.subServices.includes(sub)} onChange={() => toggleSub(sub)} className="rounded border-slate-300 text-purple focus:ring-purple" />
                          <span>{sub}</span>
                          <span className="ml-auto text-xs font-bold text-purple">{currency(priceMap[sub])}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <button disabled={!form.mainService.length} onClick={() => setStep(2)} className="gradient-button rounded-xl px-6 py-3 font-bold disabled:opacity-40">Next</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">Project Title<input required value={form.projectTitle} onChange={(e) => update('projectTitle', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="text-sm font-bold">Preferred Start Date<input type="date" value={form.preferredStartDate} onChange={(e) => update('preferredStartDate', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="text-sm font-bold">Priority Level
              <select value={form.priorityLevel} onChange={(e) => update('priorityLevel', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple bg-white">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>
            <label className="md:col-span-2 text-sm font-bold">Reference Links (comma separated)<input value={form.referenceLinks} onChange={(e) => update('referenceLinks', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="md:col-span-2 text-sm font-bold">Detailed Requirement<textarea required value={form.requirementDetails} onChange={(e) => update('requirementDetails', e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="md:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-4 text-sm font-bold text-slate-500"><Paperclip size={18} /><input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" /> Attachment Upload: PDF, DOC, DOCX, JPG, PNG up to 5MB</label>
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-xl border border-line px-5 py-3 font-bold">Back</button>
            <button onClick={() => setStep(3)} className="gradient-button rounded-xl px-6 py-3 font-bold">Next</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-xl font-black">Review Summary</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {form.mainService.map((item) => <StatusBadge key={item} status={item} />)}
              {form.subServices.map((item) => <StatusBadge key={item} status={item} />)}
            </div>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-surface p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Project Title</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.projectTitle}</dd></div>
              <div className="rounded-xl bg-surface p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Start Date</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.preferredStartDate || 'N/A'}</dd></div>
              <div className="rounded-xl bg-surface p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Priority Level</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.priorityLevel}</dd></div>
              <div className="rounded-xl bg-surface p-4 md:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Detailed Requirement</dt><dd className="mt-1 text-sm font-semibold text-slate-800 whitespace-pre-wrap">{form.requirementDetails}</dd></div>
              <div className="rounded-xl bg-surface p-4 md:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Reference Links</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.referenceLinks || 'None'}</dd></div>
            </dl>
          </div>
          <aside className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <label className="flex gap-3 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={declared} onChange={(event) => setDeclared(event.target.checked)} />
              I confirm that the above service requirements are correct.
            </label>
            <button disabled={!canSubmit || submitting} onClick={submit} className="gradient-button mt-5 w-full rounded-xl px-5 py-3 font-bold disabled:opacity-40">{submitting ? 'Submitting...' : 'Submit Quotation'}</button>
            <button onClick={() => setStep(2)} className="mt-3 w-full rounded-xl border border-line px-5 py-3 font-bold">Back</button>
          </aside>
        </section>
      )}
    </div>
  );
}
