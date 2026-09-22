import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Hash,
  IndianRupee,
  Layers,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import AmountSummaryCard from '../components/AmountSummaryCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ToastNotification from '../components/ToastNotification.jsx';
import losServices, { losTiers } from '../data/losServices.js';
import { currency, formatDate, recordId } from '../utils/format.js';

export default function GenerateQuotation({ role = 'Accountant' }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customClient, setCustomClient] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    gstin: '',
    clientId: 'AUTO-GEN'
  });

  const [quotationMeta, setQuotationMeta] = useState({
    projectTitle: '',
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    billingType: 'Client Billing',
    priorityLevel: 'Medium',
    requirementDetails: ''
  });

  // 3-Level Cascading Service Selection States
  const [selectedModule, setSelectedModule] = useState('Web Apps');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedTier, setSelectedTier] = useState('starter');
  const [itemQty, setItemQty] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);

  // Selected Services / Costing Items list
  const [costingItems, setCostingItems] = useState([]);

  // Saving & Status
  const [submitting, setSubmitting] = useState(false);
  const [savedQuotation, setSavedQuotation] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '' });

  // Inline "added" confirmation above the Add Service button
  const [addedMsg, setAddedMsg] = useState('');

  // 1. Fetch available clients
  useEffect(() => {
    api.get('/clients')
      .then(({ data }) => {
        setClients(data || []);
        if (data && data.length > 0) {
          setSelectedClientId(recordId(data[0]));
        }
      })
      .catch((err) => {
        console.warn('Clients load notice:', err.message);
      });
  }, []);

  // Sync client form when client selection changes
  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'NEW') {
      const match = clients.find((c) => recordId(c) === selectedClientId);
      if (match) {
        setCustomClient({
          fullName: match.fullName || '',
          email: match.email || '',
          phone: match.phone || '',
          companyName: match.companyName || match.fullName || '',
          address: match.address || '',
          gstin: match.gstin || '',
          clientId: match.clientId || match._id
        });
      }
    } else if (selectedClientId === 'NEW') {
      setCustomClient({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        address: '',
        gstin: '',
        clientId: 'NEW-CLIENT'
      });
    }
  }, [clients, selectedClientId]);

  // Dynamic modules list from losServices
  const availableModules = useMemo(
    () => [...new Set(losServices.map((s) => s.module))],
    []
  );

  // Filter services by selected module
  const availableServicesInModule = useMemo(
    () => losServices.filter((s) => s.module === selectedModule),
    [selectedModule]
  );

  // Reset selected service when module changes
  useEffect(() => {
    if (availableServicesInModule.length > 0) {
      setSelectedServiceId(String(availableServicesInModule[0].id));
    } else {
      setSelectedServiceId('');
    }
  }, [availableServicesInModule]);

  // Current active service object
  const activeServiceObj = useMemo(
    () => losServices.find((s) => String(s.id) === String(selectedServiceId)) || availableServicesInModule[0],
    [selectedServiceId, availableServicesInModule]
  );

  // Calculate pricing for current service dropdown preview
  const currentTierPrice = useMemo(() => {
    if (!activeServiceObj) return 0;
    return Number(activeServiceObj.prices?.[selectedTier] || 0);
  }, [activeServiceObj, selectedTier]);

  const currentTierNote = useMemo(() => {
    if (!activeServiceObj) return '';
    return activeServiceObj.tierNotes?.[selectedTier] || activeServiceObj.description;
  }, [activeServiceObj, selectedTier]);

  // Add line item from dropdowns to table
  const addServiceLineItem = () => {
    if (!activeServiceObj) return;

    const basePrice = currentTierPrice;
    const qty = Math.max(1, Number(itemQty || 1));
    const discPct = Math.min(20, Math.max(0, Number(itemDiscount || 0)));
    const lineBaseTotal = basePrice * qty;
    const discAmount = (lineBaseTotal * discPct) / 100;
    const taxableValue = lineBaseTotal - discAmount;
    const gstPct = 18;
    const gstAmount = (taxableValue * gstPct) / 100;
    const totalAmount = taxableValue + gstAmount;

    const tierObj = losTiers.find((t) => t.key === selectedTier);
    const tierLabel = tierObj ? tierObj.label : 'Starter';

    const newItem = {
      tempId: Date.now() + Math.random(),
      serviceId: activeServiceObj.id,
      mainService: activeServiceObj.module,
      subService: activeServiceObj.service,
      subServiceName: activeServiceObj.service,
      description: `${activeServiceObj.service} (${tierLabel}) - ${currentTierNote}`,
      tier: tierLabel,
      tierKey: selectedTier,
      sacCode: activeServiceObj.sacCode || '998314',
      unit: activeServiceObj.unit || 'Per Service',
      frequency: activeServiceObj.frequency || 'One Time',
      basePrice,
      quantity: qty,
      discountPercentage: discPct,
      discountAmount: discAmount,
      taxableValue,
      gstPercentage: gstPct,
      gstAmount,
      totalAmount
    };

    setCostingItems((prev) => [...prev, newItem]);
    setMessage({ type: '', text: '' });
    setToast({ show: true, message: `"${activeServiceObj.service}" added to quotation queue.` });

    // Inline popup above the Add Service button
    setAddedMsg(`✓ "${activeServiceObj.service}" added to queue`);
    setTimeout(() => setAddedMsg(''), 2500);
  };

  // Remove item line
  const removeServiceLineItem = (tempId) => {
    setCostingItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Summary calculations
  const totals = useMemo(() => {
    const subtotal = costingItems.reduce((sum, item) => sum + item.taxableValue, 0);
    const gst = costingItems.reduce((sum, item) => sum + item.gstAmount, 0);
    const grandTotal = subtotal + gst;
    return { subtotal, gst, grandTotal };
  }, [costingItems]);

  // Save quotation to database
  const handleSaveQuotation = async () => {
    if (!costingItems.length) {
      setMessage({ type: 'error', text: 'Please add at least one service to generate the quotation.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        projectTitle: quotationMeta.projectTitle || `${customClient.companyName || customClient.fullName} Quotation`,
        requirementDetails: quotationMeta.requirementDetails || 'Custom quotation generated by admin/accountant.',
        priorityLevel: quotationMeta.priorityLevel,
        status: 'Approved',
        clientDetails: selectedClientId === 'NEW' ? customClient : undefined,
        clientId: selectedClientId !== 'NEW' ? selectedClientId : undefined,
        costingItems: costingItems.map((item) => ({
          mainService: item.mainService,
          subService: item.subService,
          subServiceName: item.subServiceName,
          sacCode: item.sacCode,
          description: item.description,
          basePrice: item.basePrice,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          taxableValue: item.taxableValue,
          gstPercentage: item.gstPercentage,
          gstAmount: item.gstAmount,
          totalAmount: item.totalAmount
        })),
        subtotal: totals.subtotal,
        gstAmount: totals.gst,
        totalAmount: totals.grandTotal
      };

      const { data } = await api.post('/quotations', payload);
      setSavedQuotation(data);
      setMessage({ type: 'success', text: `Quotation ${data.quotationId} generated and saved successfully!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Unable to generate quotation.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!savedQuotation) return;
    try {
      setMessage({ type: '', text: '' });
      const id = recordId(savedQuotation);
      const { data: blob } = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${savedQuotation.quotationId || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: 'PDF download failed: ' + (err.response?.data?.message || err.message) });
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple hover:underline"
          >
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <h1 className="text-3xl font-black text-slate-950">Quotation Generation</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Create, price, and issue official quotations directly with 3-tier service selection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedQuotation ? (
            <>
              <button
                onClick={handleDownloadPdf}
                className="gradient-button flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold shadow-glow"
              >
                <Download size={18} /> Download / Print PDF
              </button>
              <button
                onClick={() => {
                  setSavedQuotation(null);
                  setCostingItems([]);
                  setMessage({ type: '', text: '' });
                }}
                className="rounded-xl border border-line bg-white px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
              >
                + New Quotation
              </button>
            </>
          ) : (
            <button
              onClick={handleSaveQuotation}
              disabled={submitting || costingItems.length === 0}
              className="gradient-button flex items-center gap-2 rounded-xl px-6 py-3 font-bold shadow-glow disabled:opacity-40"
            >
              <FileCheck2 size={18} /> {submitting ? 'Generating...' : 'Save & Issue Quotation'}
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {message.text}
        </p>
      )}

      {/* SECTION 1: INVOICE-STYLE TWO-BOX HEADER CARDS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Box 1: CLIENT DETAILS */}
        <div className="rounded-2xl border border-line bg-white shadow-premium overflow-hidden">
          <div className="border-b border-line bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wider text-white flex items-center justify-between">
            <span className="flex items-center gap-2"><UserCheck size={16} className="text-purple" /> Client Details</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-white outline-none focus:border-purple"
            >
              {clients.map((client) => (
                <option key={recordId(client)} value={recordId(client)}>
                  {client.companyName ? `${client.companyName} (${client.fullName})` : client.fullName}
                </option>
              ))}
              <option value="NEW">+ Add Custom Client</option>
            </select>
          </div>

          <div className="p-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Client Name</label>
              <input
                type="text"
                value={customClient.fullName}
                onChange={(e) => setCustomClient({ ...customClient, fullName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                placeholder="e.g. Bit Byte Tech"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">E-Mail</label>
              <input
                type="email"
                value={customClient.email}
                onChange={(e) => setCustomClient({ ...customClient, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                placeholder="e.g. client@gmail.com"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Phone</label>
              <input
                type="text"
                value={customClient.phone}
                onChange={(e) => setCustomClient({ ...customClient, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                placeholder="e.g. 7339201392"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Company</label>
              <input
                type="text"
                value={customClient.companyName}
                onChange={(e) => setCustomClient({ ...customClient, companyName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                placeholder="e.g. Bit Byte Tech"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">GSTIN / PAN</label>
              <input
                type="text"
                value={customClient.gstin}
                onChange={(e) => setCustomClient({ ...customClient, gstin: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                placeholder="Optional GSTIN"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Client ID</label>
              <input
                type="text"
                readOnly
                value={customClient.clientId}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Box 2: QUOTATION & PAYMENT DETAILS */}
        <div className="rounded-2xl border border-line bg-white shadow-premium overflow-hidden">
          <div className="border-b border-line bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wider text-white flex items-center justify-between">
            <span className="flex items-center gap-2"><FileText size={16} className="text-purple" /> Quotation Details</span>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              Ready to Issue
            </span>
          </div>

          <div className="p-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Quotation DT</label>
              <input
                type="date"
                value={quotationMeta.quotationDate}
                onChange={(e) => setQuotationMeta({ ...quotationMeta, quotationDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Quotation ID</label>
              <input
                type="text"
                readOnly
                value={savedQuotation ? savedQuotation.quotationId : 'BBT-QT-2026-AUTO'}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold text-purple"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Valid Until / Due Date</label>
              <input
                type="date"
                value={quotationMeta.validUntil}
                onChange={(e) => setQuotationMeta({ ...quotationMeta, validUntil: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Status</label>
              <div className="mt-1.5">
                <StatusBadge status={savedQuotation ? savedQuotation.status : 'Approved'} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Generated By</label>
              <input
                type="text"
                readOnly
                value={`BBTech ${role} Team`}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Billing Type</label>
              <input
                type="text"
                readOnly
                value={quotationMeta.billingType}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MULTI-LEVEL 3-TIER DROPDOWNS SERVICE SELECTOR */}
      <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
        <div className="mb-5 flex flex-col gap-1 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple">Mandatory Service Picker</p>
            <h2 className="text-xl font-black text-slate-950">Select Services via 3-Tier Dropdowns</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Fetch from client service catalog (`losServices.js`)
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Dropdown 1: Module / Category */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              1. Service Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-slate-900 outline-purple"
            >
              {availableModules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Service under Module */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              2. Service Name
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-slate-900 outline-purple"
            >
              {availableServicesInModule.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.service}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 3: Tier */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              3. Service Tier
            </label>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-slate-900 outline-purple"
            >
              {losTiers.map((tier) => (
                <option key={tier.key} value={tier.key}>
                  {tier.label} Tier
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Service Details & Pricing Preview Box */}
        {activeServiceObj && (
          <div className="mt-5 rounded-2xl border border-purple/20 bg-purple/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple/10 px-2.5 py-0.5 text-xs font-black text-purple">
                    {activeServiceObj.module}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    SAC {activeServiceObj.sacCode}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {activeServiceObj.unit} · {activeServiceObj.frequency}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-black text-slate-950">{activeServiceObj.service}</h3>
                <p className="mt-1 text-xs font-medium text-slate-600">{currentTierNote}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-purple/10 pt-3 md:border-t-0 md:pt-0">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-16 rounded-xl border border-line bg-white px-2 py-1.5 text-center text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400">Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(e.target.value)}
                      className="w-20 rounded-xl border border-line bg-white px-2 py-1.5 text-center text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400">Tier Rate</p>
                  <p className="text-xl font-black text-purple">{currency(currentTierPrice)}</p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {/* Inline popup above Add Service button */}
                  <div
                    className={`flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-all duration-300 ${
                      addedMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
                    }`}
                    aria-live="polite"
                  >
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                    {addedMsg || 'Added to queue'}
                  </div>

                  <button
                    type="button"
                    onClick={addServiceLineItem}
                    className="gradient-button flex h-11 items-center gap-2 rounded-xl px-5 font-bold text-white shadow-sm"
                  >
                    <Plus size={18} /> Add Service
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: ITEMIZED SELECTED SERVICES TABLE (INVOICE TEMPLATE STYLE) */}
      <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-purple">Line Items</p>
            <h2 className="text-xl font-black text-slate-950">Selected Services Breakdown</h2>
          </div>
          <span className="rounded-full bg-purple/10 px-3 py-1 text-xs font-black text-purple">
            {costingItems.length} {costingItems.length === 1 ? 'Service' : 'Services'} Added
          </span>
        </div>

        <div className="mobile-table overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs font-black uppercase tracking-wider text-white">
              <tr>
                <th className="p-3 text-center">S.No</th>
                <th className="p-3">Service & Description</th>
                <th className="p-3 text-center">SAC Code</th>
                <th className="p-3 text-center">Tier</th>
                <th className="p-3 text-right">Base Price</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">GST (18%)</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {costingItems.length > 0 ? (
                costingItems.map((item, index) => (
                  <tr key={item.tempId || index} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center font-black text-slate-500">{index + 1}</td>
                    <td className="p-3">
                      <p className="font-black text-slate-950">{item.subService}</p>
                      <p className="text-xs font-medium text-slate-500">{item.description}</p>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{item.sacCode}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="rounded bg-purple/10 px-2.5 py-1 text-xs font-black text-purple">
                        {item.tier}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{currency(item.basePrice)}</td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-right font-semibold">{currency(item.taxableValue)}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">{currency(item.gstAmount)}</td>
                    <td className="p-3 text-right font-black text-purple">{currency(item.totalAmount)}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeServiceLineItem(item.tempId)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove service"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Sparkles className="mx-auto mb-2 text-slate-300" size={32} />
                    <p className="text-sm font-bold text-slate-600">No services selected yet</p>
                    <p className="text-xs text-slate-400">Use the 3-tier dropdown selector above to add services.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="mt-6 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-md text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Terms & Conditions:</p>
            <p>1. Quotation prices are valid for 15 days from issue date.</p>
            <p>2. Standard GST of 18% is applicable on services as mandated.</p>
            <p>3. This is an official quotation generated by Bit Byte Technologies.</p>
          </div>

          <AmountSummaryCard
            subtotal={totals.subtotal}
            gst={totals.gst}
            paid={0}
            originalSubtotal={totals.subtotal}
            discount={0}
          />
        </div>
      </section>
    </div>

    {/* Toast notification for service added to queue */}
    <ToastNotification
      show={toast.show}
      message={toast.message}
      onDone={() => setToast({ show: false, message: '' })}
    />
    </>
  );
}
