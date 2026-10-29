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
  UserPlus,
  MessageCircle
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
    salutation: 'Mr',
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    gstin: '',
    clientId: 'AUTO-GEN'
  });

  const [quickClientModal, setQuickClientModal] = useState({
    open: false,
    salutation: 'Mr',
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    error: '',
    loading: false
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
  const [isOptionalItem, setIsOptionalItem] = useState(false);
  const [isComplimentaryItem, setIsComplimentaryItem] = useState(false);

  // Special configurators
  const [moduleCount, setModuleCount] = useState(2);      // 2-10 modules (service 24)
  const [imagesPerModule, setImagesPerModule] = useState(15); // 1-15 images/module (service 24)
  const [changesCount, setChangesCount] = useState(15);   // 1-15 changes (service 23)
  const [whatsappCategoryCount, setWhatsappCategoryCount] = useState(15); // min 15 categories (service 53)
  const [erpModuleCount, setErpModuleCount] = useState(6); // min 6 modules (service 55)

  // Price override — lets user edit the default tier price for ANY service
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);

  // Custom service fields (when serviceId === 'CUSTOM_SERVICE')
  const isCustomService = selectedServiceId === 'CUSTOM_SERVICE';
  const [customServiceName, setCustomServiceName] = useState('');
  const [customBasePrice, setCustomBasePrice] = useState(1990);

  // Calculate price range bounds (Starter tier min & Enterprise tier max for standard module, or ₹1,990 - ₹9,990 for Custom Service)
  const modulePriceBounds = useMemo(() => {
    if (isCustomService) {
      return {
        min: 1990,
        max: 9990,
        moduleName: 'Custom Service'
      };
    }
    const modServices = losServices.filter((s) => s.module === selectedModule);

    if (!modServices.length) {
      const allStarters = losServices.map((s) => s.prices?.starter).filter(Boolean);
      const allEnterprises = losServices.map((s) => s.prices?.enterprise).filter(Boolean);
      return {
        min: Math.min(...allStarters),
        max: Math.max(...allEnterprises),
        moduleName: selectedModule || 'All Services'
      };
    }

    const starterPrices = modServices.map((s) => s.prices?.starter).filter(Boolean);
    const enterprisePrices = modServices.map((s) => s.prices?.enterprise).filter(Boolean);

    return {
      min: Math.min(...starterPrices),
      max: Math.max(...enterprisePrices),
      moduleName: selectedModule
    };
  }, [selectedModule, isCustomService]);

  // Selected Services / Costing Items list
  const [costingItems, setCostingItems] = useState([]);

  // Saving & Status
  const [submitting, setSubmitting] = useState(false);
  const [savedQuotation, setSavedQuotation] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

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
          salutation: match.salutation || 'Mr',
          fullName: match.fullName || '',
          email: match.email || '',
          phone: match.phone || '',
          companyName: match.companyName || '',
          address: match.address || '',
          gstin: match.gstin || '',
          clientId: match.clientId || match._id
        });
      }
    } else if (selectedClientId === 'NEW') {
      setCustomClient({
        salutation: 'Mr',
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

  const handleSaveQuickClient = async (e) => {
    e.preventDefault();
    setQuickClientModal((p) => ({ ...p, loading: true, error: '' }));
    try {
      const { data } = await api.post('/clients', {
        salutation: quickClientModal.salutation || 'Mr',
        fullName: quickClientModal.fullName,
        companyName: quickClientModal.companyName,
        email: quickClientModal.email,
        phone: quickClientModal.phone,
        address: quickClientModal.address || undefined,
        gstin: quickClientModal.gstin || undefined
      });
      const res = await api.get('/clients');
      const updatedClients = res.data || [];
      setClients(updatedClients);
      const newId = recordId(data);
      setSelectedClientId(newId);
      setQuickClientModal({ open: false, salutation: 'Mr', fullName: '', companyName: '', email: '', phone: '', address: '', gstin: '', error: '', loading: false });
    } catch (err) {
      setQuickClientModal((p) => ({
        ...p,
        loading: false,
        error: err.response?.data?.message || 'Failed to register client details.'
      }));
    }
  };

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
      setCustomServiceName('');
      setCustomBasePrice(1990);
    } else {
      setSelectedServiceId('');
    }
  }, [availableServicesInModule]);

  // Current active service object
  const activeServiceObj = useMemo(
    () => losServices.find((s) => String(s.id) === String(selectedServiceId)) || availableServicesInModule[0],
    [selectedServiceId, availableServicesInModule]
  );

  // ── Special service flags ──
  // Service 24: module-images service (price × moduleCount)
  const isModuleService = !isCustomService && (activeServiceObj?.id === 24 || activeServiceObj?.id === 22);
  // Service 23: changes service (count up to 15)
  const isChangesService = !isCustomService && activeServiceObj?.id === 23;
  // Service 53: WhatsApp Automation Customization (Base ₹9,990 up to 15 categories, +₹2,990 per extra category)
  const isWhatsAppCustomization = !isCustomService && activeServiceObj?.id === 53;
  // Service 55: ERP, CRM, PRM, HRMS (Base ₹39,990 up to 6 modules, +₹6,990 per extra module)
  const isErpCrmService = !isCustomService && activeServiceObj?.id === 55;

  // Reset special-service params when active service changes
  useEffect(() => {
    if (isModuleService) {
      setModuleCount(2);
      setImagesPerModule(15);
    } else if (isChangesService) {
      setChangesCount(15);
    } else if (isWhatsAppCustomization) {
      setWhatsappCategoryCount(15);
    } else if (isErpCrmService) {
      setErpModuleCount(6);
    }
  }, [activeServiceObj?.id]);

  // Default custom price when custom service, AMC, or customised tier selected
  useEffect(() => {
    if (isCustomService) {
      setCustomBasePrice(1990);
      setPriceOverrideEnabled(false);
    } else if (activeServiceObj && (selectedTier === 'customised' || activeServiceObj.frequency === 'Yearly' || activeServiceObj.service?.toLowerCase().includes('amc'))) {
      const defaultVal = activeServiceObj.prices?.[selectedTier] || activeServiceObj.prices?.customised || activeServiceObj.prices?.enterprise || 10000;
      setCustomBasePrice(defaultVal);
      setPriceOverrideEnabled(false);
    } else if (activeServiceObj) {
      // For standard services: reset override and sync customBasePrice to the new tier price
      setPriceOverrideEnabled(false);
      setCustomBasePrice(Number(activeServiceObj.prices?.[selectedTier] || 0));
    }
  }, [isCustomService, selectedTier, activeServiceObj]);

  // Calculate pricing for current service dropdown preview
  const currentTierPrice = useMemo(() => {
    if (isComplimentaryItem) return 0;
    if (!activeServiceObj) return 0;
    if (isWhatsAppCustomization) {
      const extra = Math.max(0, Number(whatsappCategoryCount) - 15);
      return 9990 + extra * 2990;
    }
    if (isErpCrmService) {
      const extra = Math.max(0, Number(erpModuleCount) - 6);
      return 39990 + extra * 6990;
    }
    if (selectedTier === 'customised' || activeServiceObj.frequency === 'Yearly' || activeServiceObj.service?.toLowerCase().includes('amc')) {
      return Number(customBasePrice || activeServiceObj.prices?.[selectedTier] || activeServiceObj.prices?.customised || 10000);
    }
    return Number(activeServiceObj.prices?.[selectedTier] || 0);
  }, [activeServiceObj, selectedTier, customBasePrice, isComplimentaryItem, isWhatsAppCustomization, whatsappCategoryCount, isErpCrmService, erpModuleCount]);

  const currentTierNote = useMemo(() => {
    if (!activeServiceObj) return '';
    return activeServiceObj.tierNotes?.[selectedTier] || activeServiceObj.tierNotes?.enterprise || activeServiceObj.description;
  }, [activeServiceObj, selectedTier]);

  // Custom price change handler
  const handleCustomPriceChange = (val) => {
    if (val === '') {
      setCustomBasePrice('');
      return;
    }
    const num = Number(val);
    if (isNaN(num)) return;
    setCustomBasePrice(val);
  };

  const handleCustomPriceBlur = () => {
    const num = Number(customBasePrice);
    if (isNaN(num) || num < 0) {
      setCustomBasePrice(0);
    }
  };

  // Add line item from dropdowns to table
  const addServiceLineItem = () => {
    // isManualEntry: original conditions + price override
    const isManualEntry = isCustomService || priceOverrideEnabled || selectedTier === 'customised' || activeServiceObj?.frequency === 'Yearly' || activeServiceObj?.service?.toLowerCase().includes('amc');

    if (isCustomService) {
      if (!customServiceName.trim()) {
        setMessage({ type: 'error', text: 'Please enter a custom service name.' });
        return;
      }
      let priceVal = Number(customBasePrice || 0);
      if (isNaN(priceVal) || priceVal < 0) {
        setMessage({ type: 'error', text: 'Please enter a valid base price for Custom Service.' });
        return;
      }
    } else if (isManualEntry) {
      let priceVal = Number(customBasePrice || 0);
      if (isNaN(priceVal) || priceVal < 0) {
        setMessage({ type: 'error', text: 'Please enter a valid price for this service.' });
        return;
      }
    } else if (!activeServiceObj) {
      return;
    }

    // For module-images service: validate module count
    if (isModuleService) {
      const mc = Number(moduleCount);
      if (isNaN(mc) || mc < 2 || mc > 10) {
        setMessage({ type: 'error', text: 'Module count must be between 2 and 10.' });
        return;
      }
    }

    const isComplimentary = Boolean(isComplimentaryItem);
    const basePrice = isComplimentary
      ? 0
      : isWhatsAppCustomization
      ? (9990 + Math.max(0, Number(whatsappCategoryCount) - 15) * 2990)
      : isErpCrmService
      ? (39990 + Math.max(0, Number(erpModuleCount) - 6) * 6990)
      : isManualEntry
      ? Number(customBasePrice)
      : currentTierPrice;

    const serviceName = isCustomService ? customServiceName.trim() : activeServiceObj.service;
    const moduleLabel = selectedModule;

    // For module service: quantity = moduleCount; for changes: quantity = changesCount; else: user qty
    const qty = isModuleService
      ? Math.max(2, Math.min(10, Number(moduleCount || 2)))
      : isChangesService
        ? Math.max(1, Math.min(15, Number(changesCount || 15)))
        : Math.max(1, Number(itemQty || 1));

    const discPct = isComplimentary ? 0 : Math.min(20, Math.max(0, Number(itemDiscount || 0)));
    const lineBaseTotal = isComplimentary ? 0 : basePrice * qty;
    const discAmount = isComplimentary ? 0 : (lineBaseTotal * discPct) / 100;
    const taxableValue = isComplimentary ? 0 : lineBaseTotal - discAmount;
    const gstPct = 18;
    const gstAmount = isComplimentary ? 0 : (taxableValue * gstPct) / 100;
    const totalAmount = isComplimentary ? 0 : taxableValue + gstAmount;

    const tierObj = losTiers.find((t) => t.key === selectedTier);
    const tierLabel = tierObj ? tierObj.label : 'Starter';

    // Build an enriched description for special services
    let itemDescription;
    if (isComplimentary) {
      itemDescription = `${serviceName} — Complimentary Service (Free of Charge)`;
    } else if (isWhatsAppCustomization) {
      const extra = Math.max(0, Number(whatsappCategoryCount) - 15);
      itemDescription = `${serviceName} — ${whatsappCategoryCount} Categories (${extra > 0 ? `15 Base + ${extra} Additional @ ₹2,990/cat` : 'up to 15 categories included'}). ${currentTierNote}`;
    } else if (isErpCrmService) {
      const extra = Math.max(0, Number(erpModuleCount) - 6);
      itemDescription = `${serviceName} — ${erpModuleCount} Modules (${extra > 0 ? `6 Base + ${extra} Additional @ ₹6,990/mod` : 'up to 6 modules included'}). ${currentTierNote}`;
    } else if (isModuleService) {
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
      serviceId: isCustomService ? null : activeServiceObj.id,
      mainService: moduleLabel,
      subService: serviceName,
      subServiceName: serviceName,
      description: itemDescription,
      tier: isComplimentary ? 'Complimentary' : tierLabel,
      tierKey: selectedTier,
      sacCode: isCustomService ? '998314' : (activeServiceObj.sacCode || '998314'),
      unit: isCustomService ? 'Per Service' : (activeServiceObj.unit || 'Per Service'),
      frequency: isCustomService ? 'One Time' : (activeServiceObj.frequency || 'One Time'),
      payable: isCustomService ? 'One Time' : (activeServiceObj.payable || 'One Time'),
      isOptional: isComplimentary ? false : Boolean(isOptionalItem),
      isComplimentary: isComplimentary,
      // Store extra config for display
      ...(isModuleService ? { moduleCount: Number(moduleCount), imagesPerModule: Math.max(1, Math.min(15, Number(imagesPerModule || 15))) } : {}),
      ...(isChangesService ? { changesCount: Math.max(1, Math.min(15, Number(changesCount || 15))) } : {}),
      ...(isWhatsAppCustomization ? { whatsappCategoryCount: Number(whatsappCategoryCount) } : {}),
      ...(isErpCrmService ? { erpModuleCount: Number(erpModuleCount) } : {}),
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
    setIsOptionalItem(false);
    setIsComplimentaryItem(false);
    setMessage({ type: '', text: '' });
    setToast({ show: true, message: `"${serviceName}" added to quotation queue.` });

    setAddedMsg(`✓ "${serviceName}" added to queue`);
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
        status: 'Forwarded to Admin',
        clientDetails: customClient,
        sendWhatsApp,
        clientId: (selectedClientId && selectedClientId !== 'NEW') ? selectedClientId : undefined,
        costingItems: costingItems.map((item) => ({
          mainService: item.mainService,
          subService: item.subService,
          subServiceName: item.subServiceName,
          sacCode: item.sacCode,
          description: item.description,
          unit: item.unit,
          frequency: item.frequency,
          payable: item.payable,
          isOptional: item.isOptional,
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

      if (data.managementWhatsApp?.success) {
        setMessage({
          type: 'success',
          text: `Quotation ${data.quotationId} generated and sent to Management WhatsApp (MD, ED, CEO, Office) for review! Once approved by Admin, it will be sent to the client.`
        });
      } else if (data.managementWhatsApp?.error) {
        setMessage({
          type: 'success',
          text: `Quotation ${data.quotationId} saved for management approval. (Management WhatsApp note: ${data.managementWhatsApp.error})`
        });
      } else {
        setMessage({
          type: 'success',
          text: `Quotation ${data.quotationId} generated and forwarded to Admin & Management for review!`
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Unable to generate quotation.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!savedQuotation) return;
    const id = recordId(savedQuotation);
    setSendingWhatsApp(true);
    try {
      setMessage({ type: '', text: '' });
      const { data } = await api.post(`/quotations/${id}/send-whatsapp`, {
        phone: customClient.phone
      });
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Quotation PDF sent directly to client WhatsApp (+${data.result?.contact || customClient.phone})!`
        });
      } else {
        const errDetail = typeof data.result?.error === 'string'
          ? data.result.error
          : (data.result?.error?.ErrorMessage?.error?.message || data.result?.error?.ApiMessage || data.message || 'Check Tendigit credentials in server/.env');
        setMessage({
          type: 'error',
          text: `WhatsApp delivery: ${errDetail}`
        });
      }
      if (data.quotation) {
        setSavedQuotation(data.quotation);
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'WhatsApp send failed: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setSendingWhatsApp(false);
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
                type="button"
                onClick={handleSendWhatsApp}
                disabled={sendingWhatsApp}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white shadow-glow hover:bg-emerald-700 disabled:opacity-50 transition-all"
                title="Send or resend quotation PDF directly to client WhatsApp"
              >
                <MessageCircle size={18} /> {sendingWhatsApp ? 'Sending WhatsApp...' : 'Send WhatsApp'}
              </button>
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
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none rounded-xl border border-purple/30 bg-purple/5 px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-purple/10 transition-colors shadow-sm">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="h-4 w-4 rounded accent-purple cursor-pointer"
                />
                <MessageCircle size={16} className="text-purple" />
                <span>Send PDF to Management WhatsApp</span>
                <span className="font-semibold text-purple text-[10px] bg-purple/10 px-2 py-0.5 rounded-full">MD · ED · CEO · Office</span>
              </label>
              <button
                onClick={handleSaveQuotation}
                disabled={submitting || costingItems.length === 0}
                className="gradient-button flex items-center gap-2 rounded-xl px-6 py-3 font-bold shadow-glow disabled:opacity-40"
              >
                <FileCheck2 size={18} /> {submitting ? 'Submitting...' : 'Submit for Management Approval'}
              </button>
            </div>
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
          <div className="border-b border-line bg-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wider text-white flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <UserCheck size={16} className="text-purple" /> Client Details
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedClientId}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    setQuickClientModal({ open: true, fullName: '', companyName: '', email: '', phone: '', address: '', gstin: '', error: '', loading: false });
                  } else {
                    setSelectedClientId(e.target.value);
                  }
                }}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-purple cursor-pointer"
              >
                <option value="" disabled>-- Select Saved Client --</option>
                {clients.map((client) => (
                  <option key={recordId(client)} value={recordId(client)}>
                    {client.companyName ? `${client.companyName} (${client.fullName})` : client.fullName}
                  </option>
                ))}
                <option value="NEW">+ Quick Add Client</option>
              </select>
              <button
                type="button"
                onClick={() => setQuickClientModal({ open: true, fullName: '', companyName: '', email: '', phone: '', address: '', gstin: '', error: '', loading: false })}
                className="flex items-center gap-1 rounded-lg border border-purple/40 bg-purple/20 px-2 py-1 text-xs font-bold text-purple hover:bg-purple/30 transition"
              >
                <UserPlus size={13} /> Add
              </button>
            </div>
          </div>

          {selectedClientId && selectedClientId !== 'NEW' && (
            <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 py-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" /> Details auto-fetched from Saved Client record
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase">
                {customClient.clientId}
              </span>
            </div>
          )}

          <div className="p-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">Salutation & Client Name</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={customClient.salutation || 'Mr'}
                  onChange={(e) => setCustomClient({ ...customClient, salutation: e.target.value })}
                  className="rounded-xl border border-line bg-white px-2.5 py-2 text-sm font-bold text-slate-700 outline-purple cursor-pointer"
                >
                  <option value="Mr">Mr.</option>
                  <option value="Ms">Ms.</option>
                  <option value="Mrs">Mrs.</option>
                  <option value="Dr">Dr.</option>
                  <option value="Prof">Prof.</option>
                  <option value="M/s">M/s</option>
                </select>
                <input
                  type="text"
                  value={customClient.fullName}
                  onChange={(e) => setCustomClient({ ...customClient, fullName: e.target.value })}
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                  placeholder="e.g. Varakumar"
                />
              </div>
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

          {/* Dropdown 2: Service under Module — OR text input for Custom */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              2. Service Name
            </label>
            {isCustomService ? (
              <div className="relative">
                <input
                  type="text"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  placeholder="Enter custom service name"
                  className="w-full rounded-xl border border-purple bg-white py-3 pl-4 pr-20 text-sm font-bold text-slate-900 outline-purple placeholder:text-slate-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceId(availableServicesInModule[0] ? String(availableServicesInModule[0].id) : '');
                    setCustomServiceName('');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  title="Switch back to standard service dropdown"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-bold text-slate-900 outline-purple"
              >
                {availableServicesInModule.map((service) => {
                  const isDuplicateName = availableServicesInModule.filter((s) => s.service === service.service).length > 1;
                  const labelText = isDuplicateName && service.description
                    ? `${service.service} (${service.description})`
                    : service.service;
                  return (
                    <option key={service.id} value={service.id}>
                      {labelText}
                    </option>
                  );
                })}
                <option value="CUSTOM_SERVICE"> + Custom Service</option>
              </select>
            )}
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
        {(activeServiceObj || isCustomService) && (
          <div className="mt-5 rounded-2xl border border-purple/20 bg-purple/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple/10 px-2.5 py-0.5 text-xs font-black text-purple">
                    {isCustomService ? 'Custom Service' : activeServiceObj.module}
                  </span>
                  {!isCustomService && (
                    <>
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        SAC {activeServiceObj.sacCode}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                        {activeServiceObj.unit} · {activeServiceObj.frequency}
                      </span>
                    </>
                  )}
                  {isCustomService && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                      Manual Entry
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-black text-slate-950">
                  {isCustomService ? (customServiceName || 'Enter custom service name above') : activeServiceObj.service}
                </h3>
                {!isCustomService && (
                  <p className="mt-1 text-xs font-medium text-slate-600">{currentTierNote}</p>
                )}
              </div>

              {/* ── SPECIAL SERVICE CONFIGURATOR (service 24 — Module Images) ── */}
              {isModuleService && (
                <div className="mt-4 w-full rounded-2xl border-2 border-purple/30 bg-gradient-to-br from-purple/10 to-purple/5 p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full bg-purple px-3 py-0.5 text-xs font-black text-white">📦 Module Configuration</span>
                    <span className="text-[11px] font-semibold text-slate-500">Min 2 modules · Max 10 modules · Up to 15 images/module</span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Module Count */}
                    <div className="rounded-xl border border-purple/20 bg-white p-4">
                      <label className="block text-xs font-black uppercase tracking-wider text-purple mb-2">📐 Number of Modules</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setModuleCount((c) => Math.max(2, Number(c) - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-purple/30 bg-purple/10 font-black text-purple text-lg hover:bg-purple hover:text-white transition-all"
                        >−</button>
                        <div className="flex-1 text-center">
                          <span className="text-3xl font-black text-slate-950">{moduleCount}</span>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{moduleCount} × {currency(currentTierPrice)} = {currency(currentTierPrice * Number(moduleCount))}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModuleCount((c) => Math.min(10, Number(c) + 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-purple/30 bg-purple/10 font-black text-purple text-lg hover:bg-purple hover:text-white transition-all"
                        >+</button>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={10}
                        step={1}
                        value={moduleCount}
                        onChange={(e) => setModuleCount(Number(e.target.value))}
                        className="mt-3 w-full accent-purple"
                      />
                      <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                        <span>2 min</span><span>10 max</span>
                      </div>
                    </div>
                    {/* Images per Module */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 mb-2">🖼️ Images per Module</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setImagesPerModule((c) => Math.max(1, Number(c) - 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-emerald-200 bg-white font-black text-emerald-700 text-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                        >−</button>
                        <div className="flex-1 text-center">
                          <span className="text-3xl font-black text-slate-950">{imagesPerModule}</span>
                          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{imagesPerModule} images × {moduleCount} module{moduleCount > 1 ? 's' : ''} = {imagesPerModule * moduleCount} total</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImagesPerModule((c) => Math.min(15, Number(c) + 1))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-emerald-200 bg-white font-black text-emerald-700 text-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all"
                        >+</button>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={1}
                        value={imagesPerModule}
                        onChange={(e) => setImagesPerModule(Number(e.target.value))}
                        className="mt-3 w-full accent-emerald-500"
                      />
                      <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                        <span>1 min</span><span>15 max</span>
                      </div>
                    </div>
                  </div>
                  {/* Summary bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-purple/20 bg-white p-3">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-slate-400">Module Total Price</p>
                      <p className="text-2xl font-black text-purple">{currency(currentTierPrice * Number(moduleCount))}</p>
                      <p className="text-[10px] text-slate-500">{moduleCount} modules × {currency(currentTierPrice)}/module (excl. GST)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-slate-400">Total Images</p>
                      <p className="text-2xl font-black text-emerald-600">{imagesPerModule * Number(moduleCount)}</p>
                      <p className="text-[10px] text-slate-500">{imagesPerModule} images × {moduleCount} module{moduleCount > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SPECIAL SERVICE CONFIGURATOR (service 23 — Changes) ── */}
              {isChangesService && (
                <div className="mt-4 w-full rounded-2xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="rounded-full bg-amber-500 px-3 py-0.5 text-xs font-black text-white">✏️ Change Pack Configuration</span>
                    <span className="text-[11px] font-semibold text-slate-500">Max 15 changes after initial setup (Starter tier)</span>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-700 mb-2">🔧 Number of Changes</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setChangesCount((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-amber-300 bg-amber-50 font-black text-amber-700 text-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                      >−</button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-black text-slate-950">{changesCount}</span>
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">of 15 max changes</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChangesCount((c) => Math.min(15, Number(c) + 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-amber-300 bg-amber-50 font-black text-amber-700 text-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                      >+</button>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={changesCount}
                      onChange={(e) => setChangesCount(Number(e.target.value))}
                      className="mt-3 w-full accent-amber-500"
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>1 min</span><span>15 max</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SPECIAL SERVICE CONFIGURATOR (service 53 — WhatsApp Automation Customization) ── */}
              {isWhatsAppCustomization && !isComplimentaryItem && (
                <div className="mt-4 w-full rounded-2xl border-2 border-emerald-400/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-black text-white">📱 WhatsApp Automation Customization</span>
                    <span className="text-[11px] font-bold text-emerald-800">Base ₹9,990 (up to 15 categories) · +₹2,990 / extra category</span>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white p-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-emerald-800 mb-2">📋 Number of Categories</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setWhatsappCategoryCount((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 font-black text-emerald-700 text-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                      >−</button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-black text-slate-950">{whatsappCategoryCount}</span>
                        <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                          {whatsappCategoryCount <= 15
                            ? 'Included in base price (up to 15 categories)'
                            : `15 Base + ${whatsappCategoryCount - 15} Extra (+${currency((whatsappCategoryCount - 15) * 2990)})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappCategoryCount((c) => Math.min(50, Number(c) + 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 font-black text-emerald-700 text-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                      >+</button>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={40}
                      step={1}
                      value={whatsappCategoryCount}
                      onChange={(e) => setWhatsappCategoryCount(Number(e.target.value))}
                      className="mt-3 w-full accent-emerald-600"
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>1 min</span><span>15 base included</span><span>40 max</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SPECIAL SERVICE CONFIGURATOR (service 55 — ERP, CRM, PRM, HRMS) ── */}
              {isErpCrmService && !isComplimentaryItem && (
                <div className="mt-4 w-full rounded-2xl border-2 border-indigo-400/70 bg-gradient-to-br from-indigo-50 to-blue-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-black text-white">🏢 ERP, CRM, PRM, HRMS App Suite</span>
                    <span className="text-[11px] font-bold text-indigo-800">Base ₹39,990 (up to 6 modules) · +₹6,990 / extra module</span>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-white p-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-indigo-800 mb-2">📦 Number of App Modules</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setErpModuleCount((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-indigo-300 bg-indigo-50 font-black text-indigo-700 text-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                      >−</button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-black text-slate-950">{erpModuleCount}</span>
                        <p className="text-[11px] font-bold text-indigo-700 mt-0.5">
                          {erpModuleCount <= 6
                            ? 'Included in base price (up to 6 modules)'
                            : `6 Base + ${erpModuleCount - 6} Extra (+${currency((erpModuleCount - 6) * 6990)})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setErpModuleCount((c) => Math.min(25, Number(c) + 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-indigo-300 bg-indigo-50 font-black text-indigo-700 text-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
                      >+</button>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={erpModuleCount}
                      onChange={(e) => setErpModuleCount(Number(e.target.value))}
                      className="mt-3 w-full accent-indigo-600"
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>1 min</span><span>6 base included</span><span>20 max</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 border-t border-purple/10 pt-3 md:border-t-0 md:pt-0">
                <div className="flex items-center gap-3">
                  {/* Price input — always shown when manual/AMC/customised/custom/override */}
                  {!isComplimentaryItem && (isCustomService || priceOverrideEnabled || selectedTier === 'customised' || activeServiceObj?.frequency === 'Yearly' || activeServiceObj?.service?.toLowerCase().includes('amc')) && (
                    <div className="flex flex-col items-start">
                      <label className="block text-[10px] font-black uppercase text-slate-400">
                        {activeServiceObj?.frequency === 'Yearly' || activeServiceObj?.service?.toLowerCase().includes('amc')
                          ? 'AMC / Yearly Price (\u20b9)'
                          : selectedTier === 'customised'
                          ? 'Customised Price (\u20b9)'
                          : priceOverrideEnabled
                          ? 'Override Price (\u20b9)'
                          : 'Base Price (\u20b9)'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={customBasePrice}
                        onChange={(e) => handleCustomPriceChange(e.target.value)}
                        onBlur={handleCustomPriceBlur}
                        className={`w-36 rounded-xl border-2 px-2.5 py-1.5 text-center text-sm font-black text-slate-900 shadow-sm transition-colors outline-none ${
                          priceOverrideEnabled
                            ? 'border-orange-400 bg-orange-50 focus:border-orange-500'
                            : 'border-purple bg-purple/10 hover:border-purple-600 focus:border-purple-600'
                        }`}
                        placeholder="0"
                      />
                      <span className="mt-1 text-[10px] font-extrabold flex items-center gap-1 text-purple">
                        {priceOverrideEnabled ? '✏️ Price Overridden' : '🔄 Manual Price Entry'}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-16 rounded-xl border border-line bg-white px-2 py-1.5 text-center text-sm font-bold"
                      disabled={isModuleService || isChangesService}
                      title={isModuleService ? 'Qty is set by module count' : isChangesService ? 'Qty is set by changes count' : ''}
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
                      disabled={isComplimentaryItem}
                      className={`w-20 rounded-xl border border-line bg-white px-2 py-1.5 text-center text-sm font-bold ${isComplimentaryItem ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 transition-colors self-end mb-0.5">
                    <input
                      type="checkbox"
                      checked={isOptionalItem}
                      onChange={(e) => {
                        setIsOptionalItem(e.target.checked);
                        if (e.target.checked) setIsComplimentaryItem(false);
                      }}
                      className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold whitespace-nowrap">💡 Optional Suggestion</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-900 transition-colors self-end mb-0.5">
                    <input
                      type="checkbox"
                      checked={isComplimentaryItem}
                      onChange={(e) => {
                        setIsComplimentaryItem(e.target.checked);
                        if (e.target.checked) {
                          setIsOptionalItem(false);
                          setPriceOverrideEnabled(false);
                        }
                      }}
                      className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold whitespace-nowrap">🎁 Complimentary (₹0)</span>
                  </label>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 flex items-center justify-end gap-1.5">
                    {isComplimentaryItem
                      ? 'Complimentary'
                      : isCustomService
                      ? 'Custom Rate'
                      : isModuleService
                      ? 'Per Module Rate'
                      : isWhatsAppCustomization
                      ? 'Customization Rate'
                      : isErpCrmService
                      ? 'Suite Rate'
                      : selectedTier === 'customised'
                      ? 'Customised Rate'
                      : priceOverrideEnabled
                      ? 'Overridden Rate'
                      : 'Tier Rate'}
                    {/* Edit price toggle — only shown for standard (non-manual) services when not complimentary */}
                    {!isComplimentaryItem && !isCustomService && !isModuleService && !isWhatsAppCustomization && !isErpCrmService && selectedTier !== 'customised' && activeServiceObj?.frequency !== 'Yearly' && !activeServiceObj?.service?.toLowerCase().includes('amc') && (
                      <button
                        type="button"
                        title={priceOverrideEnabled ? 'Reset to tier price' : 'Override default price'}
                        onClick={() => {
                          if (priceOverrideEnabled) {
                            // Reset to tier price
                            setPriceOverrideEnabled(false);
                            setCustomBasePrice(Number(activeServiceObj?.prices?.[selectedTier] || 0));
                          } else {
                            // Enable override: pre-fill with current tier price
                            setCustomBasePrice(Number(activeServiceObj?.prices?.[selectedTier] || 0));
                            setPriceOverrideEnabled(true);
                          }
                        }}
                        className={`ml-1 rounded-lg px-1.5 py-0.5 text-[10px] font-black transition-all border ${
                          priceOverrideEnabled
                            ? 'bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-purple/10 hover:border-purple/30 hover:text-purple'
                        }`}
                      >
                        {priceOverrideEnabled ? '↩ Reset' : '✏️ Edit'}
                      </button>
                    )}
                  </p>
                  <p className={`text-xl font-black ${isComplimentaryItem ? 'text-emerald-600' : 'text-purple'}`}>
                    {isComplimentaryItem
                      ? '₹0 (Free)'
                      : isModuleService
                      ? currency(currentTierPrice * Number(moduleCount))
                      : currency((isCustomService || selectedTier === 'customised' || priceOverrideEnabled) ? Number(customBasePrice || 0) : currentTierPrice)}
                  </p>
                  {isComplimentaryItem && (
                    <p className="text-[10px] text-emerald-600 font-bold">100% complimentary service</p>
                  )}
                  {!isComplimentaryItem && isModuleService && (
                    <p className="text-[10px] text-slate-500">{moduleCount} × {currency(currentTierPrice)}</p>
                  )}
                  {!isComplimentaryItem && isWhatsAppCustomization && (
                    <p className="text-[10px] text-emerald-700 font-bold">{whatsappCategoryCount} categories</p>
                  )}
                  {!isComplimentaryItem && isErpCrmService && (
                    <p className="text-[10px] text-indigo-700 font-bold">{erpModuleCount} modules</p>
                  )}
                  {!isComplimentaryItem && priceOverrideEnabled && !isModuleService && (
                    <p className="text-[10px] text-orange-500 font-bold">was {currency(activeServiceObj?.prices?.[selectedTier] || 0)}</p>
                  )}
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
                <th className="p-3 text-right">Discount</th>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">{item.subService}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black border ${
                          (item.frequency === 'Monthly' || item.payable === 'Monthly' || item.frequency === 'Weekly')
                            ? 'bg-purple/10 text-purple border-purple/20'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {(item.frequency === 'Monthly' || item.payable === 'Monthly') ? '🔄 Monthly Recurring' : item.frequency === 'Weekly' ? '🔄 Weekly' : '⚡ One Time'}
                        </span>
                        {item.isOptional && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            💡 Optional Suggestion
                          </span>
                        )}
                        {item.isComplimentary && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🎁 Complimentary (₹0)
                          </span>
                        )}
                        {item.whatsappCategoryCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            📱 {item.whatsappCategoryCount} categories
                          </span>
                        )}
                        {item.erpModuleCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                            🏢 {item.erpModuleCount} modules
                          </span>
                        )}
                        {item.moduleCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-purple/10 text-purple border border-purple/20">
                            📦 {item.moduleCount} module{item.moduleCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {item.imagesPerModule > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🖼️ {item.imagesPerModule} imgs/mod
                          </span>
                        )}
                        {item.changesCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            ✏️ {item.changesCount} change{item.changesCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500">{item.description}</p>
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
                    <td className="p-3 text-right">
                      {item.discountPercentage > 0 ? (
                        <span className="text-red-600 font-bold">
                          {item.discountPercentage}%
                          <span className="block text-[10px] text-red-400">-{currency(item.discountAmount)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
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
                  <td colSpan={11} className="py-12 text-center text-slate-400">
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

    {/* Quick Register Client Modal */}
    {quickClientModal.open && (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy/50 backdrop-blur-sm p-4 pt-6 md:pt-10 overflow-y-auto">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-premium mb-8">
          <h2 className="text-xl font-black mb-4 text-slate-900">Quick Register New Client</h2>
          <form onSubmit={handleSaveQuickClient} className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase text-slate-500">Salutation *
              <select value={quickClientModal.salutation || 'Mr'} onChange={e => setQuickClientModal(p => ({ ...p, salutation: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple bg-white">
                <option value="Mr">Mr.</option>
                <option value="Ms">Ms.</option>
                <option value="Mrs">Mrs.</option>
                <option value="Dr">Dr.</option>
                <option value="Prof">Prof.</option>
                <option value="M/s">M/s</option>
              </select>
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500">Full Name *
              <input required value={quickClientModal.fullName} onChange={e => setQuickClientModal(p => ({ ...p, fullName: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="John Doe" />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500 sm:col-span-2">Company Name
              <input value={quickClientModal.companyName} onChange={e => setQuickClientModal(p => ({ ...p, companyName: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="Bit Byte Tech" />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500">Email *
              <input type="email" required value={quickClientModal.email} onChange={e => setQuickClientModal(p => ({ ...p, email: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="client@gmail.com" />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500">Phone (10 Digits) *
              <input type="text" required pattern="\d{10}" value={quickClientModal.phone} onChange={e => setQuickClientModal(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="9876543210" />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500">GSTIN
              <input value={quickClientModal.gstin} onChange={e => setQuickClientModal(p => ({ ...p, gstin: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="Optional GSTIN" />
            </label>
            <label className="block text-xs font-bold uppercase text-slate-500 sm:col-span-2">Address
              <input value={quickClientModal.address} onChange={e => setQuickClientModal(p => ({ ...p, address: e.target.value }))} className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple" placeholder="Full Address" />
            </label>
            {quickClientModal.error && <p className="sm:col-span-2 text-xs font-semibold text-red-500">{quickClientModal.error}</p>}
            <div className="sm:col-span-2 mt-4 flex gap-3">
              <button type="button" onClick={() => setQuickClientModal(p => ({ ...p, open: false }))} className="flex-1 rounded-xl border border-line py-2 font-bold hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={quickClientModal.loading} className="gradient-button flex-1 rounded-xl py-2 font-bold disabled:opacity-60">{quickClientModal.loading ? 'Registering...' : 'Register & Select'}</button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
