import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, CheckCircle } from 'lucide-react';
import Stepper from '../components/Stepper.jsx';
import { quotationsAPI } from '../api.js';

const SERVICE_CATALOG = {
  'Web Development': [
    'Custom Website', 'E-Commerce Website', 'Web Dashboard', 'Landing Page', 'Web Application'
  ],
  'Digital Marketing': [
    'SEO', 'AEO', 'GEO', 'Performance Marketing', 'Google Ads', 
    'Social Media Marketing', 'Content Marketing', 'Creative Digital Experiences', 
    'Analytics, Automation & Growth Intelligence'
  ],
  'Personal Branding': [
    'Profile Optimization', 'Content Strategy', 'Visual Branding', 'Growth & Engagement'
  ],
  'Business Analytics': [
    'Business Intelligence Dashboard', 'Data Analytics & Reporting', 'Sales & Revenue Analytics', 
    'Customer & Marketing Analytics', 'Operation & Workflow Analytics', 'Predictive Analytics & Forecasting', 
    'KPI Tracking & Performance Tracking', 'Data Integration & Automation'
  ],
  'Imagination to Reality': [],
  'Real-Time Sales Data Driven Solutions': [
    'ERP & CRM Integration', 'Inventory Tracking', 'Customer Insights', 'Automated Reporting', 
    'Predictive Analytics', 'Branch & Team Comparison', 'Executive KPI Monitoring'
  ]
};

export default function NewQuotation() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    mainService: '',
    subServices: [],
    projectTitle: '',
    requirementDetails: '',
    budgetRange: '',
    preferredStartDate: '',
    referenceLinks: '',
    priorityLevel: 'Medium'
  });
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const toggleSubService = (svc) => {
    setForm(current => ({
      ...current,
      subServices: current.subServices.includes(svc)
        ? current.subServices.filter(s => s !== svc)
        : [...current.subServices, svc]
    }));
  };

  const handleMainServiceChange = (e) => {
    const val = e.target.value;
    setForm(current => ({ ...current, mainService: val, subServices: [] }));
  };

  const canProceedStep1 = form.mainService !== '' && (SERVICE_CATALOG[form.mainService].length === 0 || form.subServices.length > 0);
  const canProceedStep2 = form.projectTitle && form.requirementDetails && form.budgetRange;
  const canSubmit = canProceedStep1 && canProceedStep2 && declared;

  const submit = async () => {
    setSubmitting(true);
    try {
      await quotationsAPI.create({
        ...form,
        // Since referenceLinks is expected as array by backend
        referenceLinks: form.referenceLinks ? form.referenceLinks.split(',').map(s => s.trim()) : [],
        confirmationAccepted: declared
      });
      // Assuming layout uses toast, but we can't easily access toast here without hook context if not exported,
      // so we just alert or rely on navigate
      navigate('/client/quotations');
    } catch (err) {
      console.error(err);
      alert('Failed to submit quotation');
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

      {step === 1 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium max-w-3xl mx-auto">
          <h2 className="text-xl font-black mb-6">What type of service do you need?</h2>
          
          <label className="block text-sm font-bold mb-6">
            Main Service Category
            <select 
              value={form.mainService} 
              onChange={handleMainServiceChange}
              className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple bg-surface"
            >
              <option value="" disabled>Select a category...</option>
              {Object.keys(SERVICE_CATALOG).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          {form.mainService && SERVICE_CATALOG[form.mainService].length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm font-bold mb-3">Select Specific Services (Multiple allowed)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVICE_CATALOG[form.mainService].map(svc => (
                  <label 
                    key={svc} 
                    onClick={() => toggleSubService(svc)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${form.subServices.includes(svc) ? 'border-purple bg-purple/5 text-purple' : 'border-line hover:border-purple/30'}`}
                  >
                    <div className={`grid h-5 w-5 place-items-center rounded-full border ${form.subServices.includes(svc) ? 'border-purple bg-purple' : 'border-slate-300'}`}>
                      {form.subServices.includes(svc) && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <span className="text-sm font-bold">{svc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.mainService === 'Imagination to Reality' && (
            <div className="mt-4 rounded-xl bg-purple/5 p-4 border border-purple/10">
              <p className="text-sm text-purple font-semibold">You have selected a custom idea! You will be able to describe your unique requirements in the next step.</p>
            </div>
          )}

          <div className="mt-8 flex justify-end pt-6 border-t border-line">
            <button disabled={!canProceedStep1} onClick={() => setStep(2)} className="gradient-button rounded-xl px-8 py-3 font-bold disabled:opacity-40">Continue to Details</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-line bg-white p-6 shadow-premium max-w-4xl mx-auto">
          <h2 className="text-xl font-black mb-6">Project Details</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-bold md:col-span-2">
              Project Title *
              <input value={form.projectTitle} onChange={(e) => update('projectTitle', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="E.g., New E-Commerce Redesign" />
            </label>
            
            <label className="text-sm font-bold md:col-span-2">
              Detailed Requirement *
              <textarea value={form.requirementDetails} onChange={(e) => update('requirementDetails', e.target.value)} className="mt-2 min-h-[120px] w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="Describe your business needs, target audience, and desired features..." />
            </label>

            <label className="text-sm font-bold">
              Budget Range *
              <select value={form.budgetRange} onChange={(e) => update('budgetRange', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple bg-surface">
                <option value="" disabled>Select a budget...</option>
                <option value="Under ₹50,000">Under ₹50,000</option>
                <option value="₹50,000 - ₹2,00,000">₹50,000 - ₹2,00,000</option>
                <option value="₹2,00,000 - ₹5,00,000">₹2,00,000 - ₹5,00,000</option>
                <option value="₹5,00,000+">₹5,00,000+</option>
              </select>
            </label>

            <label className="text-sm font-bold">
              Preferred Start Date
              <input type="date" value={form.preferredStartDate} onChange={(e) => update('preferredStartDate', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" />
            </label>

            <label className="text-sm font-bold md:col-span-2">
              Reference Links (comma separated)
              <input value={form.referenceLinks} onChange={(e) => update('referenceLinks', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="https://example.com, https://dribbble.com/..." />
            </label>

            <label className="text-sm font-bold">
              Priority Level
              <select value={form.priorityLevel} onChange={(e) => update('priorityLevel', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple bg-surface">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical (ASAP)</option>
              </select>
            </label>

            <label className="text-sm font-bold">
              Reference Files
              <div className="mt-2 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-purple/40 bg-purple/5 p-4 text-sm font-bold text-purple hover:bg-purple/10 transition-colors">
                <Paperclip size={18} /> Click to upload files (Mock)
              </div>
            </label>
          </div>
          <div className="mt-8 flex justify-between pt-6 border-t border-line">
            <button onClick={() => setStep(1)} className="rounded-xl border border-line px-6 py-3 font-bold hover:bg-slate-50 transition-colors">Back</button>
            <button disabled={!canProceedStep2} onClick={() => setStep(3)} className="gradient-button rounded-xl px-8 py-3 font-bold disabled:opacity-40">Review Summary</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-xl font-black border-b border-line pb-4 mb-4">Review Summary</h2>
            
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Selected Services</p>
              <div className="mt-2 rounded-xl bg-purple/5 border border-purple/10 p-4">
                <h3 className="font-black text-purple text-lg">{form.mainService}</h3>
                {form.subServices.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {form.subServices.map(s => (
                      <li key={s} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple/50"></div> {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <dl className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-surface p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Project Title</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{form.projectTitle}</dd>
              </div>
              <div className="rounded-xl bg-surface p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Budget Range</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{form.budgetRange}</dd>
              </div>
              <div className="rounded-xl bg-surface p-4 md:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Requirement Details</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800 whitespace-pre-wrap">{form.requirementDetails}</dd>
              </div>
              <div className="rounded-xl bg-surface p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Start Date</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{form.preferredStartDate || 'Not specified'}</dd>
              </div>
              <div className="rounded-xl bg-surface p-4">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Priority</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{form.priorityLevel}</dd>
              </div>
              {form.referenceLinks && (
                <div className="rounded-xl bg-surface p-4 md:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Reference Links</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800 break-all">{form.referenceLinks}</dd>
                </div>
              )}
            </dl>
          </div>
          
          <aside className="rounded-2xl border border-line bg-white p-6 shadow-premium h-fit sticky top-24">
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-600 p-4 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-1 w-4 h-4 text-purple rounded border-slate-300 focus:ring-purple" />
              <span>I confirm that the above service requirements are correct.</span>
            </label>
            
            <button onClick={submit} disabled={!canSubmit || submitting} className="gradient-button mt-5 w-full rounded-xl px-5 py-3 font-bold disabled:opacity-40">
              {submitting ? 'Submitting...' : 'Submit Quotation'}
            </button>
            <button onClick={() => setStep(2)} disabled={submitting} className="mt-3 w-full rounded-xl border border-line px-5 py-3 font-bold disabled:opacity-40 hover:bg-slate-50">
              Back
            </button>
          </aside>
        </section>
      )}
    </div>
  );
}
