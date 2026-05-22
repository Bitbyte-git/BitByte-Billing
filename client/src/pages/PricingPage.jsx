import { useEffect, useMemo, useState } from 'react';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import PricingTable from '../components/PricingTable.jsx';
import api from '../api.js';
import { currency, getClientName, recordId } from '../utils/format.js';
import priceMap, { serviceCatalog, serviceSubServices } from '../utils/priceList.js';

const resolveMainService = (subService, selectedMains = []) => {
  const selected = selectedMains.find((main) => serviceSubServices[main]?.includes(subService));
  if (selected) return selected;
  const priceListMain = Object.entries(serviceSubServices).find(([, subs]) => subs.includes(subService))?.[0];
  return selectedMains[0] || priceListMain || '';
};

const subServicesForMain = (mainService, selectedSubs = []) => {
  const configured = serviceSubServices[mainService] || [];
  const selected = selectedSubs.filter((sub) => !configured.includes(sub));
  return [...configured, ...selected];
};

const buildSubServicesByMain = (quotation) => {
  const mains = quotation?.mainService || [];
  const subs = quotation?.subServices || [];
  const selectedMap = mains.reduce((map, mainService) => ({
    ...map,
    [mainService]: subServicesForMain(mainService, subs)
  }), {});
  return Object.entries(serviceSubServices).reduce((map, [mainService, subServices]) => ({
    ...map,
    [mainService]: map[mainService]?.length ? map[mainService] : subServices
  }), selectedMap);
};

const buildPricingRows = (quotation, services) => {
  const existing = quotation.costingItems || [];
  if (existing.length) {
    return existing.map((item) => ({
      serviceId: item.serviceId || services.find((service) => service.name === item.mainService)?._id || '',
      mainService: item.mainService || '',
      subService: item.subService || item.subServiceName || '',
      description: item.description || '',
      basePrice: item.basePrice ?? '',
      quantity: item.quantity || 1,
      discountPercentage: item.discountPercentage || 0,
      gstPercentage: item.gstPercentage ?? 18,
      priceType: item.priceType || 'Manual'
    }));
  }

  const selectedSubs = quotation.subServices || [];
  const selectedMains = quotation.mainService || [];
  const fallback = selectedSubs.length ? selectedSubs : selectedMains;

  return fallback.map((subService) => {
    const hasAutoPrice = Object.prototype.hasOwnProperty.call(priceMap, subService);
    const mainService = selectedSubs.length ? resolveMainService(subService, selectedMains) : subService;
    const service = services.find((item) => item.name === mainService);
    return {
      serviceId: service?._id || '',
      mainService,
      subService: selectedSubs.length ? subService : '',
      description: '',
      basePrice: hasAutoPrice ? priceMap[subService] : '',
      quantity: 1,
      discountPercentage: 0,
      gstPercentage: 18,
      priceType: hasAutoPrice ? 'Auto' : 'Manual'
    };
  });
};

export default function PricingPage() {
  const [quotations, setQuotations] = useState([]);
  const [services, setServices] = useState([]);
  const [quotationId, setQuotationId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [rows, setRows] = useState([]);

  const load = () => {
    Promise.all([api.get('/quotations'), api.get('/services')])
      .then(([quotationRes, serviceRes]) => {
        const actionable = quotationRes.data.filter((item) => ['Submitted', 'Under Review', 'Needs Clarification'].includes(item.status));
        setQuotations(actionable);
        setServices(serviceRes.data.filter((service) => service.status === 'Active'));
        if (actionable[0]) setQuotationId(recordId(actionable[0]));
      })
      .catch((err) => setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to load pricing workspace.' }));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const current = quotations.find((item) => recordId(item) === quotationId);
    if (!current) {
      setRows([]);
      return;
    }
    const nextRows = buildPricingRows(current, services);
    setRows(nextRows.length ? nextRows : [{
      serviceId: services[0]?._id || '',
      mainService: current.mainService?.[0] || services[0]?.name || '',
      subService: '',
      description: '',
      basePrice: '',
      quantity: 1,
      discountPercentage: 0,
      gstPercentage: 18,
      priceType: 'Manual'
    }]);
  }, [quotationId, quotations, services]);

  const subtotal = useMemo(() => rows.reduce((sum, row) => {
    const lineBase = Number(row.basePrice || 0) * Number(row.quantity || 1);
    const discountPercentage = Math.min(Number(row.discountPercentage || 0), 20);
    return sum + lineBase - (lineBase * discountPercentage / 100);
  }, 0), [rows]);
  const gst = useMemo(() => rows.reduce((sum, row) => {
    const lineBase = Number(row.basePrice || 0) * Number(row.quantity || 1);
    const discountPercentage = Math.min(Number(row.discountPercentage || 0), 20);
    const taxableAmount = lineBase - (lineBase * discountPercentage / 100);
    return sum + taxableAmount * Number(row.gstPercentage || 0) / 100;
  }, 0), [rows]);
  const selectedQuotation = quotations.find((item) => recordId(item) === quotationId);
  const selectedMainServices = selectedQuotation?.mainService || [];
  const accountantServiceOptions = useMemo(() => {
    const allServices = serviceCatalog.map((service) => service.name);
    return [...selectedMainServices, ...allServices.filter((service) => !selectedMainServices.includes(service))];
  }, [selectedMainServices]);
  const subServicesByMain = useMemo(() => buildSubServicesByMain(selectedQuotation), [selectedQuotation]);

  const applyMainServiceSelection = (index, mainService) => {
    const service = services.find((item) => item.name === mainService);
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? {
      ...row,
      serviceId: service?._id || '',
      mainService,
      subService: '',
      basePrice: '',
      discountPercentage: 0,
      priceType: 'Manual'
    } : row));
  };

  const applySubServiceSelection = (index, subService) => {
    const selectedMains = selectedQuotation?.mainService || [];
    const currentRow = rows[index];
    const mainService = currentRow?.mainService || resolveMainService(subService, selectedMains);
    const service = services.find((item) => item.name === mainService);
    const hasAutoPrice = Object.prototype.hasOwnProperty.call(priceMap, subService);
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? {
      ...row,
      serviceId: service?._id || row.serviceId || '',
      mainService,
      subService,
      basePrice: hasAutoPrice ? priceMap[subService] : '',
      discountPercentage: 0,
      priceType: hasAutoPrice ? 'Auto' : 'Manual'
    } : row));
  };

  const saveCosting = async (forward = false) => {
    if (!quotationId || !rows.length) return;
    const missingMainService = rows.some((row) => !row.mainService);
    if (missingMainService) {
      setMessage({ type: 'error', text: 'Please select a main service for every pricing row.' });
      return;
    }
    const unavailableSubServices = rows.some((row) => !(subServicesByMain[row.mainService] || []).length);
    if (unavailableSubServices) {
      setMessage({ type: 'error', text: 'One or more selected services do not have sub-services configured. Select another service or ask the client for clarification.' });
      return;
    }
    const missingSubService = rows.some((row) => !row.subService);
    if (missingSubService) {
      setMessage({ type: 'error', text: 'Please select a sub-service for every pricing row.' });
      return;
    }
    const missing = rows.some((row) => row.basePrice === '' || row.basePrice === null || Number(row.basePrice) < 0);
    if (missing) {
      setMessage({ type: 'error', text: 'Please enter a price for every selected sub-service before continuing.' });
      return;
    }
    const invalidDiscount = rows.some((row) => Number(row.discountPercentage || 0) > 20 || Number(row.discountPercentage || 0) < 0);
    if (invalidDiscount) {
      setMessage({ type: 'error', text: 'Discount must be between 0% and 20%.' });
      return;
    }
    try {
      const { data } = await api.post(`/quotations/${quotationId}/costing`, {
        accountantRemarks: remarks,
        items: rows.map((row) => ({
          serviceId: row.serviceId,
          mainService: row.mainService,
          subService: row.subService,
          subServiceName: row.subService,
          description: row.description,
          basePrice: Number(row.basePrice || 0),
          quantity: Number(row.quantity || 1),
          discountPercentage: Math.min(Number(row.discountPercentage || 0), 20),
          gstPercentage: Number(row.gstPercentage || 0),
          priceType: row.priceType === 'Auto' ? 'Auto' : 'Manual'
        }))
      });
      if (forward) await api.post(`/quotations/${quotationId}/forward-to-admin`);
      if (data?.quotation) {
        setQuotations((current) => current.map((item) => recordId(item) === quotationId ? data.quotation : item));
      }
      setMessage({ type: 'success', text: forward ? 'Costing saved and forwarded to admin.' : 'Costing saved.' });
      if (forward) await load();
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
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Main Service</p>
              <p className="mt-1 font-semibold text-slate-800">{(selectedQuotation.mainService || []).join(', ') || '-'}</p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sub-Services</p>
              <p className="mt-1 font-semibold text-slate-800">{(selectedQuotation.subServices || []).join(', ') || '-'}</p>
            </div>
            <div className="rounded-xl bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Priority Level</p>
              <p className="mt-1 font-semibold text-slate-800">{selectedQuotation.priorityLevel || '-'}</p>
            </div>
            <div className="rounded-xl bg-surface p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Attachments</p>
              <div className="mt-1 font-semibold text-slate-800">
                {selectedQuotation.attachments?.length ? selectedQuotation.attachments.map((file) => (
                  <a key={file.url || file.filename} href={file.url} target="_blank" rel="noreferrer" className="mr-3 text-purple underline">{file.filename || 'Attachment'}</a>
                )) : '-'}
              </div>
            </div>
            <div className="rounded-xl bg-surface p-4 md:col-span-2 xl:col-span-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Requirement Details</p>
              <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-800">{selectedQuotation.requirementDetails || selectedQuotation.projectDescription || '-'}</p>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section>
          {selectedQuotation && (
            <div className="mb-5 rounded-2xl border border-line bg-white p-5 shadow-premium">
              <h2 className="text-xl font-black">Selected Sub-Services & Pricing</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedQuotation.subServices || []).length ? selectedQuotation.subServices.map((sub) => (
                  <span key={sub} className={`rounded-full border px-3 py-1 text-xs font-bold ${priceMap[sub] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                    {sub}: {priceMap[sub] ? currency(priceMap[sub]) : 'Manual Price'}
                  </span>
                )) : <span className="text-sm font-semibold text-slate-500">No sub-services were selected. Add manual pricing rows below.</span>}
              </div>
            </div>
          )}
          <PricingTable
            rows={rows}
            setRows={setRows}
            services={services}
            selectedServiceOptions={accountantServiceOptions}
            subServicesByMain={subServicesByMain}
            onMainServiceChange={applyMainServiceSelection}
            onSubServiceChange={applySubServiceSelection}
          />
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-5 min-h-28 w-full rounded-2xl border border-line bg-white p-4 shadow-sm outline-purple" placeholder="Accountant remarks..." />
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => saveCosting(false)} disabled={!quotationId || !rows.length} className="rounded-xl border border-line bg-white px-5 py-3 font-bold disabled:opacity-50">Save Pricing</button>
            <button onClick={requestClarification} disabled={!quotationId || !remarks.trim()} className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 font-bold text-orange-700 disabled:opacity-50">Request Clarification</button>
            <button onClick={() => saveCosting(true)} disabled={!quotationId || !rows.length} className="gradient-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">Forward to Admin</button>
          </div>
        </section>
        <AmountSummaryCard subtotal={subtotal} gst={gst} />
      </div>
    </div>
  );
}
