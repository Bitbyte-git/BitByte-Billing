import { useMemo, useState } from 'react';
import { CheckCircle, FileText, Loader2, Paperclip, UploadCloud, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Stepper from '../components/Stepper.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api from '../api.js';
import priceMap, { serviceCatalog } from '../utils/priceList.js';
import { getFileMimeType, uploadToCloudinary } from '../utils/cloudinary.js';
import { currency } from '../utils/format.js';

const SERVICE_DATA = serviceCatalog;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

export default function NewQuotation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [declared, setDeclared] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
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

  const canSubmit = useMemo(() => form.mainService.length > 0 && form.projectTitle && declared && !uploading, [form, declared, uploading]);

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
              <div className="rounded-xl bg-surface p-4 md:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Attachments</dt><dd className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-slate-800">{form.attachments.length ? form.attachments.map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-purple"><Paperclip size={14} />{attachment.filename}</a>) : 'None'}</dd></div>
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
