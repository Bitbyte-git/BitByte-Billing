import { useEffect, useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import ServiceSelectionCard from '../components/ServiceSelectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import { recordId } from '../utils/format.js';

export default function NewQuotation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState([]);
  const [declared, setDeclared] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projectTitle: '',
    projectDescription: '',
    preferredStartDate: '',
    budgetRange: '',
    serviceRequirement: '',
    technologyPreference: '',
    referenceLinks: '',
    priorityLevel: 'Medium'
  });

  useEffect(() => {
    api.get('/services')
      .then(({ data }) => setServices(data.filter((service) => service.status === 'Active')))
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load services.' }));
  }, []);

  const toggle = (service) => {
    const id = recordId(service);
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canSubmit = useMemo(() => selected.length && form.projectTitle && form.projectDescription && declared, [selected, form, declared]);
  const selectedServices = services.filter((service) => selected.includes(recordId(service)));

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        ...form,
        servicesSelected: selected,
        referenceLinks: form.referenceLinks.split(',').map((item) => item.trim()).filter(Boolean)
      };
      const { data } = await api.post('/quotations', payload);
      navigate(`/client/quotations/${recordId(data)}`);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to submit quotation.' });
    } finally {
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => <ServiceSelectionCard key={recordId(service)} service={service} selected={selected.includes(recordId(service))} onToggle={toggle} />)}
          </div>
          {!services.length && <p className="rounded-xl bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">No active services are available. Ask an admin to add services first.</p>}
          <div className="mt-6 flex justify-end">
            <button disabled={!selected.length} onClick={() => setStep(2)} className="gradient-button rounded-xl px-6 py-3 font-bold disabled:opacity-40">Next</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['projectTitle', 'Project Title'],
              ['preferredStartDate', 'Preferred Start Date', 'date'],
              ['budgetRange', 'Budget Range'],
              ['technologyPreference', 'Technology Preference'],
              ['referenceLinks', 'Reference Links'],
              ['priorityLevel', 'Priority Level']
            ].map(([key, label, type]) => (
              <label key={key} className="text-sm font-bold">{label}<input type={type || 'text'} value={form[key]} onChange={(event) => update(key, event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            ))}
            <label className="md:col-span-2 text-sm font-bold">Project Description<textarea value={form.projectDescription} onChange={(event) => update('projectDescription', event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="md:col-span-2 text-sm font-bold">Service Requirement<textarea value={form.serviceRequirement} onChange={(event) => update('serviceRequirement', event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
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
            <div className="mt-4 flex flex-wrap gap-2">{selectedServices.map((item) => <StatusBadge key={recordId(item)} status={item.name} />)}</div>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              {Object.entries(form).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-surface p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <aside className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <label className="flex gap-3 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={declared} onChange={(event) => setDeclared(event.target.checked)} />
              I confirm the submitted requirements are accurate and authorize Bit Byte Technologies to review this request.
            </label>
            <button disabled={!canSubmit || submitting} onClick={submit} className="gradient-button mt-5 w-full rounded-xl px-5 py-3 font-bold disabled:opacity-40">{submitting ? 'Submitting...' : 'Submit Quotation'}</button>
            <button onClick={() => setStep(2)} className="mt-3 w-full rounded-xl border border-line px-5 py-3 font-bold">Back</button>
          </aside>
        </section>
      )}
    </div>
  );
}
