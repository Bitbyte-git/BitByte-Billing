import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle,
  FileText,
  IndianRupee,
  Layers3,
  Loader2,
  Paperclip,
  Search,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import api from '../api.js';
import losServices, { losTiers } from '../data/losServices.js';
import { getFileMimeType, uploadToCloudinary } from '../utils/cloudinary.js';
import { currency } from '../utils/format.js';

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const MODULE_TONES = {
  'Digital Marketing': 'border-sky-200 bg-sky-50 text-sky-700',
  SEO: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Performance Marketing': 'border-rose-200 bg-rose-50 text-rose-700',
  'Web Apps': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Hosting: 'border-amber-200 bg-amber-50 text-amber-700',
  'Personal Branding': 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  'Mobile Apps': 'border-cyan-200 bg-cyan-50 text-cyan-700'
};

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'priceLow', label: 'Price Low' },
  { value: 'priceHigh', label: 'Price High' },
  { value: 'service', label: 'Service A-Z' }
];

function serviceLabel(service) {
  return `${service.module} - ${service.service} - ${service.description}`;
}

function serviceSearchText(service) {
  return [
    service.module,
    service.service,
    service.description,
    service.unit,
    service.frequency,
    service.payable,
    service.sacCode,
    ...Object.values(service.tierNotes || {})
  ].join(' ').toLowerCase();
}

function priceForTier(service, tier) {
  return Number(service.prices?.[tier] || 0);
}

function tierDescription(service, tier) {
  return service.tierNotes?.[tier] || service.description;
}

function ModuleBadge({ module }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${MODULE_TONES[module] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      {module}
    </span>
  );
}

export default function NewQuotation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [declared, setDeclared] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [activeTier, setActiveTier] = useState('starter');
  const [sortBy, setSortBy] = useState('recommended');

  const [form, setForm] = useState({
    mainService: [],
    subServices: [],
    projectTitle: '',
    requirementDetails: '',
    preferredStartDate: '',
    referenceLinks: '',
    priorityLevel: 'Medium',
    attachments: []
  });

  const modules = useMemo(() => ['All', ...new Set(losServices.map((service) => service.module))], []);

  const selectedServices = useMemo(() => {
    const selected = new Set(form.subServices);
    return losServices.filter((service) => selected.has(serviceLabel(service)));
  }, [form.subServices]);

  const selectedModules = useMemo(
    () => [...new Set(selectedServices.map((service) => service.module))],
    [selectedServices]
  );

  const visibleServices = useMemo(() => {
    const needle = serviceQuery.trim().toLowerCase();
    const rows = losServices.filter((service) => {
      const matchesModule = moduleFilter === 'All' || service.module === moduleFilter;
      const matchesSearch = !needle || serviceSearchText(service).includes(needle);
      return matchesModule && matchesSearch;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === 'priceLow') return priceForTier(a, activeTier) - priceForTier(b, activeTier);
      if (sortBy === 'priceHigh') return priceForTier(b, activeTier) - priceForTier(a, activeTier);
      if (sortBy === 'service') return a.service.localeCompare(b.service);
      return a.id - b.id;
    });
  }, [activeTier, moduleFilter, serviceQuery, sortBy]);

  const selectedEstimate = useMemo(
    () => selectedServices.reduce((sum, service) => sum + priceForTier(service, activeTier), 0),
    [activeTier, selectedServices]
  );

  const activeTierLabel = losTiers.find((tier) => tier.key === activeTier)?.label || 'Starter';
  const canSubmit = useMemo(
    () => selectedServices.length > 0 && form.projectTitle && declared && !uploading,
    [declared, form.projectTitle, selectedServices.length, uploading]
  );

  const syncServices = (serviceLabels) => {
    const picked = losServices.filter((service) => serviceLabels.includes(serviceLabel(service)));
    return {
      subServices: serviceLabels,
      mainService: [...new Set(picked.map((service) => service.module))]
    };
  };

  const toggleService = (service) => {
    const label = serviceLabel(service);
    setForm((current) => {
      const exists = current.subServices.includes(label);
      const nextLabels = exists
        ? current.subServices.filter((item) => item !== label)
        : [...current.subServices, label];
      return { ...current, ...syncServices(nextLabels) };
    });
  };

  const removeSelectedService = (service) => {
    const label = serviceLabel(service);
    setForm((current) => {
      const nextLabels = current.subServices.filter((item) => item !== label);
      return { ...current, ...syncServices(nextLabels) };
    });
  };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const removeAttachment = (url) => {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.url !== url)
    }));
  };

  const uploadAttachments = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const invalid = files.find((file) => file.size > MAX_ATTACHMENT_SIZE || !ALLOWED_ATTACHMENT_TYPES.includes(getFileMimeType(file)));
    if (invalid) {
      setMessage({ type: 'error', text: 'Upload PDF, DOC, DOCX, JPG, or PNG files up to 5MB each.' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadToCloudinary(file));
      }
      setForm((current) => ({
        ...current,
        attachments: [...current.attachments, ...uploaded]
      }));
      setMessage({ type: 'success', text: `${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded successfully.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Unable to upload attachment.' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        ...form,
        mainService: selectedModules,
        subServices: selectedServices.map(serviceLabel),
        confirmationAccepted: declared,
        referenceLinks: form.referenceLinks.split(',').map((item) => item.trim()).filter(Boolean)
      };
      await api.post('/quotations', payload);
      setMessage({ type: 'success', text: 'Quotation submitted successfully!' });
      setTimeout(() => navigate('/client/quotations'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to submit quotation.' });
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">Client Workflow</p>
          <h1 className="text-3xl font-black">New Quotation Request</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm">
          <div className="flex h-11 items-center gap-2 rounded-xl bg-surface px-3">
            <p className="text-xs font-black uppercase text-slate-400">Selected</p>
            <p className="text-lg font-black text-slate-950">{selectedServices.length}</p>
          </div>
          <div className="flex h-11 items-center gap-2 rounded-xl bg-surface px-3">
            <p className="text-xs font-black uppercase text-slate-400">Modules</p>
            <p className="text-lg font-black text-slate-950">{selectedModules.length}</p>
          </div>
          <div className="flex h-11 items-center gap-2 rounded-xl bg-surface px-3">
            <p className="text-xs font-black uppercase text-slate-400">View</p>
            <p className="text-lg font-black text-purple">{activeTierLabel}</p>
          </div>
        </div>
      </div>

      <Stepper steps={['Service Selection', 'Requirement Form', 'Summary & Submit']} current={step} />
      {message.text && <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{message.text}</p>}

      {step === 1 && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">Search Services</span>
                  <span className="relative flex h-14 items-center rounded-2xl border border-line bg-surface shadow-inner transition focus-within:border-purple focus-within:bg-white focus-within:ring-4 focus-within:ring-purple/10">
                    <Search className="ml-4 shrink-0 text-slate-400" size={20} />
                    <input
                      value={serviceQuery}
                      onChange={(event) => setServiceQuery(event.target.value)}
                      className="h-full flex-1 bg-transparent px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="Search by service, description, or module"
                    />
                    {serviceQuery && (
                      <button
                        type="button"
                        onClick={() => setServiceQuery('')}
                        className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-red-500"
                        aria-label="Clear service search"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </span>
                </label>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-1">
                  {losTiers.map((tier) => (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setActiveTier(tier.key)}
                      className={`h-10 rounded-lg px-3 text-sm font-black transition ${activeTier === tier.key ? 'bg-purple text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                    >
                      {tier.label}
                    </button>
                  ))}
                  </div>

                  <label className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-black text-slate-500 lg:w-[220px]">
                    <SlidersHorizontal size={17} />
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent font-black text-slate-700 outline-none"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {modules.map((module) => {
                  const active = moduleFilter === module;
                  const count = module === 'All'
                    ? losServices.length
                    : losServices.filter((service) => service.module === module).length;
                  return (
                    <button
                      key={module}
                      type="button"
                      onClick={() => setModuleFilter(module)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition ${active ? 'border-purple bg-purple text-white shadow-sm' : 'border-line bg-white text-slate-600 hover:border-purple/40 hover:bg-purple/5'}`}
                    >
                      <Layers3 size={15} />
                      {module}
                      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <div className="hidden grid-cols-[72px_minmax(280px,1.5fr)_160px_110px_150px_150px] items-center border-b border-line bg-slate-950 px-4 py-3 text-xs font-black uppercase text-white xl:grid">
                <span className="text-center">S.No</span>
                <span>Service & Description</span>
                <span>Module</span>
                <span>SAC</span>
                <span>Unit</span>
                <span className="text-right">{activeTierLabel} Cost</span>
              </div>

              <div className="divide-y divide-line">
                {visibleServices.map((service) => {
                  const selected = form.subServices.includes(serviceLabel(service));
                  const activePrice = priceForTier(service, activeTier);
                  const activeDescription = tierDescription(service, activeTier);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={`group block w-full bg-white text-left transition hover:bg-purple/5 ${selected ? 'bg-purple/5 ring-1 ring-inset ring-purple' : ''}`}
                    >
                      <div className="hidden grid-cols-[72px_minmax(280px,1.5fr)_160px_110px_150px_150px] items-center gap-0 px-4 py-4 xl:grid">
                        <div className="flex justify-center">
                          <span className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-black ${selected ? 'border-purple bg-purple text-white' : 'border-line bg-surface text-slate-500'}`}>
                            {selected ? <Check size={18} /> : service.id}
                          </span>
                        </div>
                        <div className="min-w-0 pr-5">
                          <p className="truncate text-base font-black text-slate-950">{service.service}</p>
                          <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-slate-500">{service.description}</p>
                          <p className="mt-2 inline-flex max-w-full rounded-lg bg-purple/5 px-2.5 py-1 text-xs font-black text-purple">
                            {activeTierLabel}: {activeDescription}
                          </p>
                        </div>
                        <div>
                          <ModuleBadge module={service.module} />
                        </div>
                        <div>
                          <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-black text-slate-700">
                            {service.sacCode}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-black text-slate-900">{service.unit}</span>
                          <span className="text-xs font-bold text-slate-500">{service.frequency}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-purple">{currency(activePrice)}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">{selected ? 'Selected' : 'Click to select'}</p>
                        </div>
                      </div>

                      <div className="p-4 xl:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <ModuleBadge module={service.module} />
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${selected ? 'border-purple bg-purple text-white' : 'border-line text-slate-300 group-hover:border-purple group-hover:text-purple'}`}>
                            {selected ? <Check size={17} /> : <Sparkles size={15} />}
                          </span>
                        </div>
                        <h3 className="mt-3 text-base font-black leading-6 text-slate-950">{service.service}</h3>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{service.description}</p>
                        <p className="mt-2 rounded-lg bg-purple/5 px-3 py-2 text-xs font-black leading-5 text-purple">
                          {activeTierLabel}: {activeDescription}
                        </p>
                        <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-line pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">SAC {service.sacCode}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{service.unit}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{service.frequency}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black uppercase text-slate-400">{activeTierLabel}</p>
                            <p className="text-lg font-black text-purple">{currency(activePrice)}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {!visibleServices.length && (
              <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-white px-4 py-12 text-center">
                <Sparkles className="text-slate-300" size={34} />
                <p className="mt-3 text-sm font-black text-slate-700">No matching services found</p>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-premium xl:sticky xl:top-5">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-purple">Selection</p>
                <h2 className="text-xl font-black">Your Service Cart</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple/10 text-purple">
                <CheckCircle size={22} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface p-3">
                <p className="text-xs font-black uppercase text-slate-400">Services</p>
                <p className="mt-1 text-2xl font-black">{selectedServices.length}</p>
              </div>
              <div className="rounded-xl bg-surface p-3">
                <p className="text-xs font-black uppercase text-slate-400">Estimate</p>
                <p className="mt-1 text-xl font-black text-purple">{currency(selectedEstimate)}</p>
              </div>
            </div>

            <div className="mt-4 max-h-[360px] space-y-2 overflow-auto pr-1">
              {selectedServices.length ? selectedServices.map((service) => (
                <div key={service.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{service.service}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{service.module} · SAC {service.sacCode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedService(service)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remove ${service.service}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-black text-purple">{currency(priceForTier(service, activeTier))}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{activeTierLabel}: {tierDescription(service, activeTier)}</p>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center">
                  <Sparkles className="mx-auto text-slate-300" size={28} />
                  <p className="mt-2 text-sm font-black text-slate-600">No services selected</p>
                </div>
              )}
            </div>

            <button
              disabled={!selectedServices.length}
              onClick={() => setStep(2)}
              className="gradient-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold disabled:opacity-40"
            >
              Continue <ArrowRight size={17} />
            </button>
          </aside>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
          <div className="mb-5 flex flex-col gap-2 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-purple">Requirement</p>
              <h2 className="text-2xl font-black">Project Details</h2>
            </div>
            <span className="rounded-full bg-purple/10 px-3 py-1 text-sm font-black text-purple">{selectedServices.length} services selected</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">Project Title<input required value={form.projectTitle} onChange={(e) => update('projectTitle', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="text-sm font-bold">Preferred Start Date<input type="date" value={form.preferredStartDate} onChange={(e) => update('preferredStartDate', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="text-sm font-bold">Priority Level
              <select value={form.priorityLevel} onChange={(e) => update('priorityLevel', e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 font-medium outline-purple">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>
            <label className="md:col-span-2 text-sm font-bold">Reference Links<input value={form.referenceLinks} onChange={(e) => update('referenceLinks', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <label className="md:col-span-2 text-sm font-bold">Detailed Requirement<textarea required value={form.requirementDetails} onChange={(e) => update('requirementDetails', e.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
            <div className="md:col-span-2">
              <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-5 text-center text-sm font-bold transition-colors ${uploading ? 'border-purple/30 bg-purple/5 text-purple' : 'border-line text-slate-500 hover:border-purple/40 hover:bg-purple/5'}`}>
                {uploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                <span>{uploading ? 'Uploading to Cloudinary...' : 'Upload reference files'}</span>
                <span className="text-xs font-semibold text-slate-400">PDF, DOC, DOCX, JPG, PNG up to 5MB each</span>
                <input type="file" multiple disabled={uploading} className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={uploadAttachments} />
              </label>
              {form.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.attachments.map((attachment) => (
                    <div key={attachment.url} className="flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-slate-700">
                      <FileText size={16} className="shrink-0 text-purple" />
                      <a href={attachment.url} target="_blank" rel="noreferrer" className="max-w-[220px] truncate hover:text-purple">{attachment.filename}</a>
                      <button type="button" onClick={() => removeAttachment(attachment.url)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${attachment.filename}`}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-xl border border-line px-5 py-3 font-bold">Back</button>
            <button disabled={uploading} onClick={() => setStep(3)} className="gradient-button rounded-xl px-6 py-3 font-bold disabled:opacity-40">Next</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-xl font-black">Review Summary</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {selectedServices.map((service) => (
                <div key={service.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <ModuleBadge module={service.module} />
                      <p className="mt-2 text-sm font-black text-slate-950">{service.service}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">SAC {service.sacCode} · {service.description}</p>
                      <p className="mt-2 rounded-lg bg-purple/5 px-3 py-2 text-xs font-black leading-5 text-purple">
                        {activeTierLabel}: {tierDescription(service, activeTier)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-purple">{currency(priceForTier(service, activeTier))}</p>
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-surface p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Project Title</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.projectTitle}</dd></div>
              <div className="rounded-xl bg-surface p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Start Date</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.preferredStartDate || 'N/A'}</dd></div>
              <div className="rounded-xl bg-surface p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Priority Level</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.priorityLevel}</dd></div>
              <div className="rounded-xl bg-surface p-4 md:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Detailed Requirement</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-800">{form.requirementDetails}</dd></div>
              <div className="rounded-xl bg-surface p-4 md:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Reference Links</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{form.referenceLinks || 'None'}</dd></div>
              <div className="rounded-xl bg-surface p-4 md:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Attachments</dt><dd className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-slate-800">{form.attachments.length ? form.attachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-purple"><Paperclip size={14} />{attachment.filename}</a>) : 'None'}</dd></div>
            </dl>
          </div>
          <aside className="h-fit rounded-2xl border border-line bg-white p-6 shadow-premium lg:sticky lg:top-5">
            <div className="rounded-2xl border border-purple/20 bg-purple/5 p-4">
              <div className="flex items-center gap-2 text-purple">
                <IndianRupee size={18} />
                <p className="text-sm font-black">{activeTierLabel} estimate</p>
              </div>
              <p className="mt-2 text-3xl font-black text-purple">{currency(selectedEstimate)}</p>
            </div>
            <label className="mt-5 flex gap-3 text-sm font-semibold text-slate-600">
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
