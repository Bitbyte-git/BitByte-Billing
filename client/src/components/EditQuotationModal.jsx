import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  Save,
  Trash2,
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import api from '../api.js';
import { currency, recordId } from '../utils/format.js';
import losServices, { losTiers } from '../data/losServices.js';

/**
 * EditQuotationModal
 * Props:
 *  - quotation: the full quotation object (populated)
 *  - onClose: () => void
 *  - onSaved: (updatedQuotation) => void
 */
export default function EditQuotationModal({ quotation, onClose, onSaved }) {
  // ── Description fields ──────────────────────────────────────────────
  const [fields, setFields] = useState({
    projectTitle: quotation.projectTitle || '',
    projectDescription: quotation.projectDescription || '',
    requirementDetails: quotation.requirementDetails || '',
    priorityLevel: quotation.priorityLevel || 'Medium',
    serviceRequirement: quotation.serviceRequirement || '',
    technologyPreference: quotation.technologyPreference || ''
  });

  // ── Costing items (editable copy) ───────────────────────────────────
  const [costingItems, setCostingItems] = useState(
    (quotation.costingItems || []).map((item, idx) => ({ ...item, tempId: item.tempId || `existing-${idx}` }))
  );

  // ── 3-Tier service selector ──────────────────────────────────────────
  const availableModules = useMemo(() => [...new Set(losServices.map((s) => s.module))], []);
  const [selectedModule, setSelectedModule] = useState(availableModules[0] || '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedTier, setSelectedTier] = useState('starter');
  const [itemQty, setItemQty] = useState(1);
  const [itemDiscount, setItemDiscount] = useState(0);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customBasePrice, setCustomBasePrice] = useState(1990);
  const [isOptionalItem, setIsOptionalItem] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  // Special configurators
  const [moduleCount, setModuleCount] = useState(2);
  const [imagesPerModule, setImagesPerModule] = useState(15);
  const [changesCount, setChangesCount] = useState(15);

  // Price override — edit default cost for any standard service
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);

  const isCustomService = selectedServiceId === 'CUSTOM_SERVICE';

  const availableServicesInModule = useMemo(
    () => losServices.filter((s) => s.module === selectedModule),
    [selectedModule]
  );

  // Reset service when module changes
  useEffect(() => {
    if (availableServicesInModule.length > 0) {
      setSelectedServiceId(String(availableServicesInModule[0].id));
    } else {
      setSelectedServiceId('');
    }
  }, [availableServicesInModule]);

  const activeServiceObj = useMemo(
    () => losServices.find((s) => String(s.id) === String(selectedServiceId)) || availableServicesInModule[0],
    [selectedServiceId, availableServicesInModule]
  );

  const isManualEntry = isCustomService || priceOverrideEnabled || selectedTier === 'customised' ||
    activeServiceObj?.frequency === 'Yearly' ||
    activeServiceObj?.service?.toLowerCase().includes('amc');

  // Special service flags
  const isModuleService = !isCustomService && activeServiceObj?.id === 24;
  const isChangesService = !isCustomService && activeServiceObj?.id === 23;

  // Reset special params when service changes
  useEffect(() => {
    if (isModuleService) { setModuleCount(2); setImagesPerModule(15); }
    else if (isChangesService) { setChangesCount(15); }
    // Always reset price override when switching services or tiers
    setPriceOverrideEnabled(false);
    if (activeServiceObj && !isCustomService) {
      setCustomBasePrice(Number(activeServiceObj.prices?.[selectedTier] || 0));
    }
  }, [activeServiceObj?.id, selectedTier]);

  const currentTierPrice = useMemo(() => {
    if (!activeServiceObj) return 0;
    if (isManualEntry) return Number(customBasePrice || 0);
    return Number(activeServiceObj.prices?.[selectedTier] || 0);
  }, [activeServiceObj, selectedTier, customBasePrice, isManualEntry]);

  const currentTierNote = useMemo(() => {
    if (!activeServiceObj) return '';
    return activeServiceObj.tierNotes?.[selectedTier] || activeServiceObj.description || '';
  }, [activeServiceObj, selectedTier]);

  // ── Saving state ────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Edit count guard ─────────────────────────────────────────────────
  const editCount = quotation.adminEditCount || 0;
  const editsLeft = 2 - editCount;
  const maxEditsReached = editsLeft <= 0;

  // ── Totals ─────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = costingItems.reduce((sum, i) => sum + Number(i.taxableValue || 0), 0);
    const gst = costingItems.reduce((sum, i) => sum + Number(i.gstAmount || 0), 0);
    return { subtotal, gst, grandTotal: subtotal + gst };
  }, [costingItems]);

  // ── Add service ─────────────────────────────────────────────────────
  const addServiceLineItem = () => {
    if (isCustomService && !customServiceName.trim()) {
      setError('Please enter a custom service name.');
      return;
    }
    if (!activeServiceObj && !isCustomService) return;
    if (isModuleService) {
      const mc = Number(moduleCount);
      if (isNaN(mc) || mc < 2 || mc > 10) { setError('Module count must be between 2 and 10.'); return; }
    }

    const basePrice = isManualEntry ? Number(customBasePrice) : currentTierPrice;
    const serviceName = isCustomService ? customServiceName.trim() : activeServiceObj.service;
    const moduleLabel = selectedModule;
    const qty = isModuleService
      ? Math.max(2, Math.min(10, Number(moduleCount || 2)))
      : isChangesService
        ? Math.max(1, Math.min(15, Number(changesCount || 15)))
        : Math.max(1, Number(itemQty || 1));
    const discPct = Math.min(20, Math.max(0, Number(itemDiscount || 0)));
    const lineBase = basePrice * qty;
    const discAmount = (lineBase * discPct) / 100;
    const taxableValue = lineBase - discAmount;
    const gstPct = 18;
    const gstAmount = (taxableValue * gstPct) / 100;
    const totalAmount = taxableValue + gstAmount;
    const tierObj = losTiers.find((t) => t.key === selectedTier);
    const tierLabel = tierObj ? tierObj.label : 'Starter';

    let itemDescription;
    if (isModuleService) {
      const mc = Number(moduleCount);
      const ipm = Math.max(1, Math.min(15, Number(imagesPerModule || 15)));
      itemDescription = `${serviceName} (${tierLabel}) — ${mc} Module${mc > 1 ? 's' : ''}, up to ${ipm} image${ipm > 1 ? 's' : ''}/module. ${currentTierNote}`;
    } else if (isChangesService) {
      const cc = Math.max(1, Math.min(15, Number(changesCount || 15)));
      itemDescription = `${serviceName} (${tierLabel}) — ${cc} Change${cc > 1 ? 's' : ''} after initial setup. ${currentTierNote}`;
    } else if (isCustomService) {
      itemDescription = `${serviceName} (Custom - ${tierLabel})`;
    } else {
      itemDescription = `${serviceName} (${tierLabel}) - ${currentTierNote}`;
    }

    const newItem = {
      tempId: Date.now() + Math.random(),
      serviceId: isCustomService ? null : activeServiceObj?.id,
      mainService: moduleLabel,
      subService: serviceName,
      subServiceName: serviceName,
      description: itemDescription,
      tier: tierLabel,
      tierKey: selectedTier,
      sacCode: isCustomService ? '998314' : (activeServiceObj?.sacCode || '998314'),
      unit: isCustomService ? 'Per Service' : (activeServiceObj?.unit || 'Per Service'),
      frequency: isCustomService ? 'One Time' : (activeServiceObj?.frequency || 'One Time'),
      payable: isCustomService ? 'One Time' : (activeServiceObj?.payable || 'One Time'),
      isOptional: Boolean(isOptionalItem),
      ...(isModuleService ? { moduleCount: Number(moduleCount), imagesPerModule: Math.max(1, Math.min(15, Number(imagesPerModule || 15))) } : {}),
      ...(isChangesService ? { changesCount: Math.max(1, Math.min(15, Number(changesCount || 15))) } : {}),
      basePrice,
      quantity: qty,
      discountPercentage: discPct,
      discountAmount: discAmount,
      taxableValue,
      gstPercentage: gstPct,
      gstAmount,
      totalAmount,
      priceType: 'Manual'
    };

    setCostingItems((prev) => [...prev, newItem]);
    setIsOptionalItem(false);
    setError('');
    setAddedMsg(`✓ "${serviceName}" added`);
    setTimeout(() => setAddedMsg(''), 2500);
  };

  const removeItem = (tempId) => setCostingItems((prev) => prev.filter((i) => i.tempId !== tempId));

  // Update a single field on an existing item and recalculate totals
  const updateItemField = (tempId, field, value) => {
    setCostingItems((prev) => prev.map((item) => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, [field]: value };
      // Recalculate line totals whenever price, qty, or discount changes
      if (['basePrice', 'quantity', 'discountPercentage'].includes(field)) {
        const bp = Number(field === 'basePrice' ? value : updated.basePrice) || 0;
        const qty = Math.max(1, Number(field === 'quantity' ? value : updated.quantity) || 1);
        const discPct = Math.min(100, Math.max(0, Number(field === 'discountPercentage' ? value : updated.discountPercentage) || 0));
        const lineBase = bp * qty;
        const discAmount = (lineBase * discPct) / 100;
        const taxableValue = lineBase - discAmount;
        const gstPct = Number(updated.gstPercentage) || 18;
        const gstAmount = (taxableValue * gstPct) / 100;
        updated.basePrice = bp;
        updated.quantity = qty;
        updated.discountPercentage = discPct;
        updated.discountAmount = discAmount;
        updated.taxableValue = taxableValue;
        updated.gstAmount = gstAmount;
        updated.totalAmount = taxableValue + gstAmount;
      }
      return updated;
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (maxEditsReached) return;
    if (!costingItems.length) {
      setError('At least one service is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/quotations/${recordId(quotation)}/admin-edit`, {
        ...fields,
        costingItems
      });
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-4 pt-6 md:pt-10">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl mb-8 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple/20">
              <Edit3 size={18} className="text-purple" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Edit Quotation</h2>
              <p className="text-xs font-semibold text-slate-400">{quotation.quotationId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Edit count badge */}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border ${
              editsLeft === 0
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : editsLeft === 1
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            }`}>
              {editsLeft === 0
                ? <AlertTriangle size={12} />
                : <CheckCircle2 size={12} />}
              {editsLeft} edit{editsLeft !== 1 ? 's' : ''} remaining
            </div>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {maxEditsReached ? (
          <div className="p-8 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-lg font-black text-slate-900">Maximum Edits Reached</p>
            <p className="mt-2 text-sm text-slate-500">This quotation has already been edited 2 times. No further edits are allowed.</p>
            <button onClick={onClose} className="mt-5 rounded-xl border border-line px-6 py-2.5 font-bold text-slate-700 hover:bg-slate-50">Close</button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </p>
            )}

            {/* ── Section 1: Description Fields ── */}
            <section>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-purple">Project Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Project Title</label>
                  <input
                    type="text"
                    value={fields.projectTitle}
                    onChange={(e) => setFields((f) => ({ ...f, projectTitle: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                    placeholder="e.g. Website Redesign"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Requirement Details</label>
                  <textarea
                    rows={3}
                    value={fields.requirementDetails}
                    onChange={(e) => setFields((f) => ({ ...f, requirementDetails: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple resize-none"
                    placeholder="Describe the client's requirements..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Project Description</label>
                  <textarea
                    rows={2}
                    value={fields.projectDescription}
                    onChange={(e) => setFields((f) => ({ ...f, projectDescription: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple resize-none"
                    placeholder="Short description of the project..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Priority Level</label>
                  <select
                    value={fields.priorityLevel}
                    onChange={(e) => setFields((f) => ({ ...f, priorityLevel: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-bold outline-purple bg-white"
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Technology Preference</label>
                  <input
                    type="text"
                    value={fields.technologyPreference}
                    onChange={(e) => setFields((f) => ({ ...f, technologyPreference: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                    placeholder="e.g. React, Node.js"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold uppercase text-slate-400">Service Requirement</label>
                  <input
                    type="text"
                    value={fields.serviceRequirement}
                    onChange={(e) => setFields((f) => ({ ...f, serviceRequirement: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                    placeholder="Specific service requirements..."
                  />
                </div>
              </div>
            </section>

            {/* ── Section 2: Add Service (3-Tier Selector) ── */}
            <section className="rounded-2xl border border-purple/20 bg-purple/5 p-5">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-purple">Add Service</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Module */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Module</label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-purple"
                  >
                    {availableModules.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Service name */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Service Name</label>
                  {isCustomService ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        placeholder="Custom service name"
                        className="w-full rounded-xl border border-purple bg-white py-2 pl-3 pr-16 text-sm font-bold text-slate-900 outline-purple"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(availableServicesInModule[0] ? String(availableServicesInModule[0].id) : '');
                          setCustomServiceName('');
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                      >Back</button>
                    </div>
                  ) : (
                    <select
                      value={selectedServiceId}
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-purple"
                    >
                      {availableServicesInModule.map((s) => (
                        <option key={s.id} value={s.id}>{s.service}</option>
                      ))}
                      <option value="CUSTOM_SERVICE">+ Custom Service</option>
                    </select>
                  )}
                </div>

                {/* Tier */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tier</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-purple"
                  >
                    {losTiers.map((t) => <option key={t.key} value={t.key}>{t.label} Tier</option>)}
                  </select>
                </div>
              </div>

              {/* Price / Qty / Discount row */}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                {/* Price input — shown for manual/override/AMC/customised */}
                {(isManualEntry) && (
                  <div className="flex flex-col items-start">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      {activeServiceObj?.frequency === 'Yearly' || activeServiceObj?.service?.toLowerCase().includes('amc')
                        ? 'AMC / Yearly Price (₹)'
                        : selectedTier === 'customised'
                        ? 'Customised Price (₹)'
                        : priceOverrideEnabled
                        ? 'Override Price (₹)'
                        : 'Base Price (₹)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={customBasePrice}
                      onChange={(e) => setCustomBasePrice(e.target.value)}
                      className={`w-32 rounded-xl border-2 px-2.5 py-1.5 text-center text-sm font-black outline-none transition-colors ${
                        priceOverrideEnabled
                          ? 'border-orange-400 bg-orange-50 focus:border-orange-500'
                          : 'border-purple bg-purple/10 focus:border-purple-600'
                      }`}
                    />
                    {/* Override toggle: only for standard services */}
                    {!isCustomService && !isModuleService && selectedTier !== 'customised' && activeServiceObj?.frequency !== 'Yearly' && !activeServiceObj?.service?.toLowerCase().includes('amc') && (
                      <button
                        type="button"
                        onClick={() => {
                          if (priceOverrideEnabled) {
                            setPriceOverrideEnabled(false);
                            setCustomBasePrice(Number(activeServiceObj?.prices?.[selectedTier] || 0));
                          } else {
                            setCustomBasePrice(Number(activeServiceObj?.prices?.[selectedTier] || 0));
                            setPriceOverrideEnabled(true);
                          }
                        }}
                        className={`mt-1 rounded-lg px-2 py-0.5 text-[10px] font-black transition-all border ${
                          priceOverrideEnabled
                            ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-purple/10 hover:border-purple/30 hover:text-purple'
                        }`}
                      >
                        {priceOverrideEnabled ? '↩ Reset to Tier Price' : '✏️ Override Price'}
                      </button>
                    )}
                    {priceOverrideEnabled && (
                      <span className="text-[10px] text-orange-500 font-bold mt-0.5">was {currency(activeServiceObj?.prices?.[selectedTier] || 0)}</span>
                    )}
                  </div>
                )}

                {/* Edit price button for non-manual services (when override not yet enabled) */}
                {!isCustomService && !isManualEntry && !isModuleService && !isChangesService && (
                  <div className="flex flex-col items-start">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tier Price (₹)</label>
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl border border-line bg-slate-50 px-3 py-1.5 text-sm font-black text-slate-700">{currency(activeServiceObj?.prices?.[selectedTier] || 0)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomBasePrice(Number(activeServiceObj?.prices?.[selectedTier] || 0));
                          setPriceOverrideEnabled(true);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-purple/10 hover:border-purple/30 hover:text-purple transition-all"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Module-images configurator inline (compact version for modal) */}
                {isModuleService && (
                  <div className="w-full mt-1 rounded-xl border-2 border-purple/30 bg-purple/5 p-3">
                    <p className="text-[10px] font-black uppercase text-purple mb-2">📦 Module Configuration — min 2, max 10 modules · up to 15 images/module</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Number of Modules ({moduleCount})</label>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setModuleCount((c) => Math.max(2, Number(c) - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple/30 bg-purple/10 font-black text-purple hover:bg-purple hover:text-white transition">−</button>
                          <input type="range" min={2} max={10} step={1} value={moduleCount} onChange={(e) => setModuleCount(Number(e.target.value))} className="flex-1 accent-purple" />
                          <button type="button" onClick={() => setModuleCount((c) => Math.min(10, Number(c) + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple/30 bg-purple/10 font-black text-purple hover:bg-purple hover:text-white transition">+</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{moduleCount} × {currency(currentTierPrice)} = <strong className="text-purple">{currency(currentTierPrice * moduleCount)}</strong></p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Images per Module ({imagesPerModule})</label>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setImagesPerModule((c) => Math.max(1, Number(c) - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 font-black text-emerald-700 hover:bg-emerald-500 hover:text-white transition">−</button>
                          <input type="range" min={1} max={15} step={1} value={imagesPerModule} onChange={(e) => setImagesPerModule(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                          <button type="button" onClick={() => setImagesPerModule((c) => Math.min(15, Number(c) + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 font-black text-emerald-700 hover:bg-emerald-500 hover:text-white transition">+</button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{imagesPerModule} images × {moduleCount} modules = <strong className="text-emerald-600">{imagesPerModule * moduleCount} total</strong></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Changes configurator inline (compact version for modal) */}
                {isChangesService && (
                  <div className="w-full mt-1 rounded-xl border-2 border-amber-300/60 bg-amber-50/60 p-3">
                    <p className="text-[10px] font-black uppercase text-amber-700 mb-2">✏️ Change Pack — max 15 changes (Starter tier)</p>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Number of Changes ({changesCount})</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setChangesCount((c) => Math.max(1, Number(c) - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 font-black text-amber-700 hover:bg-amber-500 hover:text-white transition">−</button>
                        <input type="range" min={1} max={15} step={1} value={changesCount} onChange={(e) => setChangesCount(Number(e.target.value))} className="flex-1 accent-amber-500" />
                        <button type="button" onClick={() => setChangesCount((c) => Math.min(15, Number(c) + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 font-black text-amber-700 hover:bg-amber-500 hover:text-white transition">+</button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{changesCount} of 15 max changes</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-16 rounded-xl border border-line bg-white px-2 py-1.5 text-center text-sm font-bold"
                    disabled={isModuleService || isChangesService}
                    title={isModuleService ? 'Set by module count' : isChangesService ? 'Set by changes count' : ''}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={itemDiscount}
                    onChange={(e) => setItemDiscount(e.target.value)}
                    className="w-20 rounded-xl border border-line bg-white px-2 py-1.5 text-center text-sm font-bold"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 transition">
                  <input
                    type="checkbox"
                    checked={isOptionalItem}
                    onChange={(e) => setIsOptionalItem(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-xs font-bold whitespace-nowrap">💡 Optional</span>
                </label>
                <div className="ml-auto flex flex-col items-end gap-1">
                  {addedMsg && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {addedMsg}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={addServiceLineItem}
                    className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-white"
                  >
                    <Plus size={16} /> Add Service
                  </button>
                </div>
              </div>
            </section>

            {/* ── Section 3: Current Services Table (EDITABLE) ── */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-purple">
                  Services ({costingItems.length})
                </p>
                <span className="text-xs font-semibold text-slate-500">Click any value to edit · 🗑 to delete</span>
              </div>

              {costingItems.length > 0 ? (
                <div className="space-y-3">
                  {costingItems.map((item, idx) => (
                    <div key={item.tempId || item.subService} className="rounded-xl border border-line bg-white p-4 hover:border-purple/30 transition">
                      {/* Row 1: Service name + badges + delete */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-purple">#{idx + 1}</span>
                            <p className="font-black text-slate-950">{item.subService || item.subServiceName}</p>
                            <span className="text-[10px] font-semibold text-slate-400">{item.mainService}</span>
                            {item.isOptional && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">💡 Optional</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.tempId)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remove service"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Row 2: Description (editable) */}
                      <div className="mt-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItemField(item.tempId, 'description', e.target.value)}
                          className="w-full rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-700 outline-purple"
                        />
                      </div>

                      {/* Row 3: Price / Qty / Discount / Totals (editable) */}
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Base Price (₹)</label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={item.basePrice}
                            onChange={(e) => updateItemField(item.tempId, 'basePrice', e.target.value)}
                            className="w-full rounded-lg border border-line px-2 py-1.5 text-sm font-black text-slate-900 outline-purple text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItemField(item.tempId, 'quantity', e.target.value)}
                            className="w-full rounded-lg border border-line px-2 py-1.5 text-sm font-bold text-center outline-purple"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Discount %</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.discountPercentage || 0}
                            onChange={(e) => updateItemField(item.tempId, 'discountPercentage', e.target.value)}
                            className="w-full rounded-lg border border-line px-2 py-1.5 text-sm font-bold text-center outline-purple"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Taxable</label>
                          <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-700 text-center">{currency(item.taxableValue)}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">GST (18%)</label>
                          <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-semibold text-slate-500 text-center">{currency(item.gstAmount)}</p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-purple mb-1">Total</label>
                          <p className="rounded-lg bg-purple/5 border border-purple/20 px-2 py-1.5 text-sm font-black text-purple text-center">{currency(item.totalAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Grand totals bar */}
                  <div className="rounded-xl bg-slate-950 p-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-bold text-white">Totals ({costingItems.length} services)</span>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400">Subtotal</p>
                        <p className="text-sm font-bold text-white">{currency(totals.subtotal)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400">GST</p>
                        <p className="text-sm font-bold text-white">{currency(totals.gst)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-purple-300">Grand Total</p>
                        <p className="text-lg font-black text-purple-300">{currency(totals.grandTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line py-10 text-center">
                  <Sparkles size={28} className="mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">No services yet</p>
                  <p className="text-xs text-slate-400">Use the service picker above to add items.</p>
                </div>
              )}
            </section>

            {/* ── Footer actions ── */}
            <div className="flex items-center justify-between border-t border-line pt-4">
              <p className="text-xs font-semibold text-slate-400">
                This will count as edit #{editCount + 1} of 2 allowed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-line px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || costingItems.length === 0}
                  className="gradient-button flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : `Save Changes (Edit ${editCount + 1}/2)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
