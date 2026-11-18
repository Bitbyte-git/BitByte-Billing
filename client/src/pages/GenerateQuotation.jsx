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
import { COUNTRY_CODES, formatPhoneNumber } from '../utils/countryCodes.js';

export default function GenerateQuotation({ role = 'Accountant' }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customClient, setCustomClient] = useState({
    salutation: 'Mr',
    fullName: '',
    email: '',
    countryCode: '+91',
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
    countryCode: '+91',
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

  // Template Format Selection: 'Advanced' (Modern Invoice) or 'Legacy' (2-Page Proposal)
  const [templateFormat, setTemplateFormat] = useState('Advanced');
  const [legacyMeta, setLegacyMeta] = useState({
    techStack: 'Flutter & Kotlin | AWS Cloud Server',
    deliveryTimeline: 'Every Week based on the requirements finalization and non-interference of requirements during the development phase.',
    paymentTerms: '70% Advance\n15% Development Stages on every Milestones\n15% Final Delivery',
    contactPersons: '' // Optional
  });

  const updateLegacyMeta = (field, value) => {
    setLegacyMeta((prev) => ({ ...prev, [field]: value }));
  };

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
  const [videoSeconds, setVideoSeconds] = useState(8); // AI video seconds (services 7 & 8)

  // Price override — lets user edit the default tier price for ANY service
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false);

  // Custom service fields (when serviceId === 'CUSTOM_SERVICE')
  const isCustomService = selectedServiceId === 'CUSTOM_SERVICE';
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceDescription, setCustomServiceDescription] = useState('');
  const [customBasePrice, setCustomBasePrice] = useState(1990);
  const [overallDiscount, setOverallDiscount] = useState({ type: 'None', value: '' });

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
          countryCode: match.countryCode || '+91',
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
        countryCode: '+91',
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
        countryCode: quickClientModal.countryCode || '+91',
        phone: quickClientModal.phone,
        address: quickClientModal.address || undefined,
        gstin: quickClientModal.gstin || undefined
      });
      const res = await api.get('/clients');
      const updatedClients = res.data || [];
      setClients(updatedClients);
      const newId = recordId(data);
      setSelectedClientId(newId);
      setQuickClientModal({ open: false, salutation: 'Mr', fullName: '', companyName: '', email: '', countryCode: '+91', phone: '', address: '', gstin: '', error: '', loading: false });
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
      setCustomServiceDescription('');
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
  // Services 7 & 8: AI Video generation services in Digital Marketing (customisable seconds)
  const isAiVideoService = !isCustomService && (activeServiceObj?.id === 7 || activeServiceObj?.id === 8);

  // Reset special-service params when active service or tier changes
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
    } else if (isAiVideoService) {
      const note = activeServiceObj?.tierNotes?.[selectedTier] || '';
      const match = note.match(/(\d+)\s*Seconds/i);
      const fallback = selectedTier === 'basic' || selectedTier === 'premium' ? 16 : (selectedTier === 'standard' || selectedTier === 'enterprise' ? 24 : 8);
      setVideoSeconds(match ? Number(match[1]) : fallback);
    }
  }, [activeServiceObj?.id, selectedTier]);

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
  }, [activeServiceObj, selectedTier, customBasePrice, isWhatsAppCustomization, whatsappCategoryCount, isErpCrmService, erpModuleCount]);

  const currentTierNote = useMemo(() => {
    if (!activeServiceObj) return '';
    return activeServiceObj.tierNotes?.[selectedTier] || activeServiceObj.tierNotes?.enterprise || activeServiceObj.description;
  }, [activeServiceObj, selectedTier]);

  const defaultServiceDescription = useMemo(() => {
    if (isCustomService) return '';
    if (!activeServiceObj) return '';
    const serviceName = activeServiceObj.service;
    const tierObj = losTiers.find((t) => t.key === selectedTier);
    const tierLabel = tierObj ? tierObj.label : 'Starter';

    if (isComplimentaryItem) {
      return `${serviceName} — Complimentary Service (Free of Charge)`;
    }
    if (isWhatsAppCustomization) {
      const extra = Math.max(0, Number(whatsappCategoryCount) - 15);
      return `${serviceName} — ${whatsappCategoryCount} Categories (${extra > 0 ? `15 Base + ${extra} Additional @ ₹2,990/cat` : 'up to 15 categories included'}). ${currentTierNote}`;
    }
    if (isErpCrmService) {
      const extra = Math.max(0, Number(erpModuleCount) - 6);
      return `${serviceName} — ${erpModuleCount} Modules (${extra > 0 ? `6 Base + ${extra} Additional @ ₹6,990/mod` : 'up to 6 modules included'}). ${currentTierNote}`;
    }
    if (isModuleService) {
      const mc = Number(moduleCount);
      const ipm = Math.max(1, Math.min(15, Number(imagesPerModule || 15)));
      return `${serviceName} (${tierLabel}) — ${mc} Module${mc > 1 ? 's' : ''}, up to ${ipm} image${ipm > 1 ? 's' : ''}/module. ${currentTierNote}`;
    }
    if (isChangesService) {
      const cc = Math.max(1, Math.min(15, Number(changesCount || 15)));
      return `${serviceName} (${tierLabel}) — ${cc} Change${cc > 1 ? 's' : ''} after initial setup. ${currentTierNote}`;
    }
    if (isAiVideoService) {
      const secs = Math.max(1, Number(videoSeconds || 8));
      const updatedNote = /\d+\s*Seconds/i.test(currentTierNote)
        ? currentTierNote.replace(/\d+\s*Seconds/i, `${secs} Seconds`)
        : `${currentTierNote} (${secs} Seconds)`;
      return `${serviceName} (${tierLabel}) — ${secs}s Video · ${updatedNote}`;
    }
    return `${serviceName} (${tierLabel}) - ${currentTierNote}`;
  }, [
    isCustomService, activeServiceObj, selectedTier, isComplimentaryItem,
    isWhatsAppCustomization, whatsappCategoryCount, isErpCrmService, erpModuleCount,
    isModuleService, moduleCount, imagesPerModule, isChangesService, changesCount,
    isAiVideoService, videoSeconds, currentTierNote
  ]);

  useEffect(() => {
    setCustomServiceDescription(defaultServiceDescription);
  }, [defaultServiceDescription]);

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
    const basePrice = isWhatsAppCustomization
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
    const lineBaseTotal = basePrice * qty;
    const discAmount = isComplimentary ? 0 : (lineBaseTotal * discPct) / 100;
    const taxableValue = lineBaseTotal - discAmount;
    const gstPct = 18;
    const gstAmount = (taxableValue * gstPct) / 100;
    const totalAmount = taxableValue + gstAmount;

    const tierObj = losTiers.find((t) => t.key === selectedTier);
    const tierLabel = tierObj ? tierObj.label : 'Starter';

    const itemDescription = customServiceDescription.trim();

    const newItem = {
      tempId: Date.now() + Math.random(),
      serviceId: (typeof activeServiceObj?._id === 'string' && /^[0-9a-fA-F]{24}$/.test(activeServiceObj._id)) ? activeServiceObj._id : undefined,
      mainService: moduleLabel,
      subService: serviceName,
      subServiceName: serviceName,
      description: itemDescription,
      timeline: 'One-Time',
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
      ...(isAiVideoService ? { videoSeconds: Math.max(1, Number(videoSeconds || 8)) } : {}),
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
    if (isCustomService) {
      setCustomServiceName('');
      setCustomServiceDescription('');
    }
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

  const updateCostingItemDescription = (tempId, value) => {
    setCostingItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, description: value } : item))
    );
  };

  const updateCostingItemTimeline = (tempId, value) => {
    setCostingItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, timeline: value } : item))
    );
  };

  // Summary calculations with overall discount (excludes complimentary & optional suggestions from billable total)
  const totals = useMemo(() => {
    const rawSubtotal = costingItems
      .filter((item) => !item.isComplimentary && !item.isOptional)
      .reduce((sum, item) => sum + item.taxableValue, 0);
    const discType = overallDiscount.type;
    const discVal = Math.max(0, Number(overallDiscount.value || 0));

    let discountAmount = 0;
    if (discType === 'Percentage' && discVal > 0) {
      discountAmount = Math.round(rawSubtotal * (Math.min(discVal, 100) / 100));
    } else if (discType === 'Fixed Amount' && discVal > 0) {
      discountAmount = Math.min(discVal, rawSubtotal);
    }

    const netTaxable = Math.max(0, rawSubtotal - discountAmount);
    const gst = Math.round(netTaxable * 0.18);
    const grandTotal = netTaxable + gst;

    return {
      subtotal: rawSubtotal,
      discountType: discType,
      discountValue: discVal,
      discountAmount,
      netTaxable,
      gst,
      grandTotal
    };
  }, [costingItems, overallDiscount]);

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
        templateFormat,
        ...(templateFormat === 'Legacy' ? {
          techStack: legacyMeta.techStack,
          deliveryTimeline: legacyMeta.deliveryTimeline,
          paymentTerms: legacyMeta.paymentTerms,
          contactPersons: legacyMeta.contactPersons ? String(legacyMeta.contactPersons).trim() : undefined
        } : {}),
        projectTitle: quotationMeta.projectTitle || `${customClient.companyName || customClient.fullName} Quotation`,
        requirementDetails: quotationMeta.requirementDetails || 'Custom quotation generated by admin/accountant.',
        priorityLevel: quotationMeta.priorityLevel,
        status: 'Forwarded to Admin',
        clientDetails: customClient,
        sendWhatsApp,
        clientId: (selectedClientId && selectedClientId !== 'NEW') ? selectedClientId : undefined,
        costingItems: costingItems.map((item) => ({
          serviceId: (typeof item.serviceId === 'string' && /^[0-9a-fA-F]{24}$/.test(item.serviceId))
            ? item.serviceId
            : undefined,
          mainService: item.mainService,
          subService: item.subService,
          subServiceName: item.subServiceName,
          sacCode: item.sacCode,
          description: item.description,
          timeline: item.timeline || 'One-Time',
          unit: item.unit,
          frequency: item.frequency,
          payable: item.payable,
          isOptional: Boolean(item.isOptional),
          isComplimentary: Boolean(item.isComplimentary),
          tier: item.tier || (item.isComplimentary ? 'Complimentary' : undefined),
          tierKey: item.tierKey,
          basePrice: item.basePrice,
          quantity: item.quantity,
          discountPercentage: item.discountPercentage,
          discountAmount: item.discountAmount,
          taxableValue: item.taxableValue,
          gstPercentage: item.gstPercentage,
          gstAmount: item.gstAmount,
          totalAmount: item.totalAmount
        })),
        finalDiscountType: totals.discountType,
        finalDiscountValue: totals.discountValue,
        finalDiscountAmount: totals.discountAmount,
        subtotal: totals.subtotal,
        gstAmount: totals.gst,
        totalAmount: totals.grandTotal
      };

      const { data } = await api.post('/quotations', payload);
      setSavedQuotation(data);

      setMessage({
        type: 'success',
        text: `Quotation ${data.quotationId} generated successfully! You can now manually trigger sending to Management or Client via WhatsApp below.`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Unable to generate quotation.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async (target = 'client') => {
    if (!savedQuotation) return;
    const id = recordId(savedQuotation);
    setSendingWhatsApp(target);
    try {
      setMessage({ type: '', text: '' });
      const { data } = await api.post(`/quotations/${id}/send-whatsapp`, {
        target,
        phone: customClient.countryCode ? `${customClient.countryCode}${customClient.phone}` : customClient.phone
      });
      if (data.success) {
        setMessage({
          type: 'success',
          text: target === 'management'
            ? `Quotation PDF sent to Management WhatsApp (${data.result?.successCount || 4}/${data.result?.totalCount || 4} delivered: MD, ED, CEO, Bit Byte Office)!`
            : `Quotation PDF sent directly to client WhatsApp (${formatPhoneNumber(data.result?.contact || customClient.phone, customClient.countryCode)})!`
        });
      } else {
        const errDetail = typeof data.result?.error === 'string'
          ? data.result.error
          : (data.result?.error?.ErrorMessage?.error?.message || data.result?.error?.ApiMessage || data.message || 'Check WhatsApp credentials in server/.env');
        setMessage({
          type: 'error',
          text: `WhatsApp delivery (${target}): ${errDetail}`
        });
      }
      if (data.quotation) {
        setSavedQuotation(data.quotation);
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: `WhatsApp send to ${target} failed: ` + (err.response?.data?.message || err.message)
      });
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const handleDownloadPdf = async (format = null) => {
    if (!savedQuotation) return;
    try {
      setMessage({ type: '', text: '' });
      const id = recordId(savedQuotation);
      const chosen = format || templateFormat || 'Advanced';
      const { data: blob } = await api.get(`/quotations/${id}/pdf`, {
        responseType: 'blob',
        params: { format: chosen }
      });
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${savedQuotation.quotationId || id}-${chosen}.pdf`;
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
                onClick={() => handleSendWhatsApp('management')}
                disabled={Boolean(sendingWhatsApp)}
                className="flex items-center gap-2 rounded-xl border border-purple/40 bg-purple/10 px-4 py-2.5 font-bold text-purple hover:bg-purple hover:text-white disabled:opacity-50 transition-all shadow-sm"
                title="Send quotation PDF to Management WhatsApp (MD, ED, CEO, Bit Byte Office)"
              >
                <MessageCircle size={18} />
                <span>{sendingWhatsApp === 'management' ? 'Sending to Management...' : '📱 Send to Management'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp('client')}
                disabled={Boolean(sendingWhatsApp)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-glow hover:bg-emerald-700 disabled:opacity-50 transition-all"
                title="Send quotation PDF directly to client WhatsApp"
              >
                <MessageCircle size={18} />
                <span>{sendingWhatsApp === 'client' ? 'Sending to Client...' : '📱 Send to Client WhatsApp'}</span>
              </button>
              <button
                onClick={() => handleDownloadPdf('Advanced')}
                className="gradient-button flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold shadow-glow text-xs"
                title="Download Advanced Template PDF"
              >
                <Download size={16} /> Advanced PDF
              </button>
              <button
                onClick={() => handleDownloadPdf('Legacy')}
                className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 font-bold text-amber-800 hover:bg-amber-500 hover:text-white transition shadow-sm text-xs"
                title="Download Legacy Proposal PDF"
              >
                <Download size={16} /> Legacy PDF
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
              <button
                onClick={handleSaveQuotation}
                disabled={submitting || costingItems.length === 0}
                className="gradient-button flex items-center gap-2 rounded-xl px-6 py-3 font-bold shadow-glow disabled:opacity-40"
              >
                <FileCheck2 size={18} /> {submitting ? 'Generating Quotation...' : 'Generate Quotation'}
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

      {/* MANUAL WHATSAPP DISPATCH CARD (After quotation is generated) */}
      {savedQuotation && (
        <div className="rounded-2xl border border-purple/20 bg-gradient-to-r from-purple/5 via-white to-emerald-50/40 p-5 shadow-premium">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-purple/10 p-2.5 text-purple mt-0.5">
                <MessageCircle size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple">Manual WhatsApp Dispatch</span>
                  <span className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">{savedQuotation.quotationId}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-1">
                  Quotation generated successfully. Click below to manually dispatch the quotation PDF via WhatsApp:
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple"></span>
                    <strong>Management:</strong> MD, ED, CEO, Bit Byte Office (4 contacts)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                    <strong>Client:</strong> {customClient.fullName || 'Client'} ({formatPhoneNumber(customClient.phone || savedQuotation.clientId?.phone, customClient.countryCode || savedQuotation.clientId?.countryCode)})
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSendWhatsApp('management')}
                disabled={Boolean(sendingWhatsApp)}
                className="flex items-center gap-1.5 rounded-xl border border-purple/30 bg-purple/10 px-4 py-2.5 text-xs font-bold text-purple hover:bg-purple hover:text-white disabled:opacity-50 transition shadow-sm"
              >
                <MessageCircle size={15} />
                <span>{sendingWhatsApp === 'management' ? 'Sending to Management...' : '📱 Send to Management WhatsApp'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp('client')}
                disabled={Boolean(sendingWhatsApp)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
              >
                <MessageCircle size={15} />
                <span>{sendingWhatsApp === 'client' ? 'Sending to Client...' : '📱 Send to Client WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: TEMPLATE FORMAT SELECTOR */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-premium">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-purple/10 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-purple">Template Format</span>
              <h2 className="text-base font-black text-slate-900">Choose Quotation PDF Template</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Select between Modern Advanced Invoice style or Classic 2-Page Legacy Proposal format.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Selected Format:</span>
            <span className={`rounded-full px-3 py-1 text-xs font-black border ${
              templateFormat === 'Legacy' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-purple/10 text-purple border-purple/30'
            }`}>
              {templateFormat === 'Legacy' ? '📜 Legacy Proposal Template' : '✨ Advanced Invoice Template'}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Card 1: Advanced Template */}
          <div
            onClick={() => setTemplateFormat('Advanced')}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
              templateFormat === 'Advanced'
                ? 'border-purple bg-purple/5 shadow-md ring-2 ring-purple/20'
                : 'border-line bg-slate-50/60 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${templateFormat === 'Advanced' ? 'bg-purple text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">Advanced Template</h3>
                    <span className="rounded-full bg-purple/10 px-2 py-0.5 text-[10px] font-black text-purple">Current Standard</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Modern corporate header banner, 2-column client summary, CGST/SGST/IGST tax breakup, QR verification code, and validity terms.
                  </p>
                </div>
              </div>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                templateFormat === 'Advanced' ? 'border-purple bg-purple text-white' : 'border-slate-300 bg-white'
              }`}>
                {templateFormat === 'Advanced' && <CheckCircle2 size={13} className="text-white" />}
              </div>
            </div>
          </div>

          {/* Card 2: Legacy Template */}
          <div
            onClick={() => setTemplateFormat('Legacy')}
            className={`cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ${
              templateFormat === 'Legacy'
                ? 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-400/20'
                : 'border-line bg-slate-50/60 hover:border-slate-300 hover:bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${templateFormat === 'Legacy' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">Legacy Template</h3>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">Proposal Format</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Classic 2-page proposal: Tech Stack box, Commercial Summary in Indian rupee words, 4 milestone payment terms, and 6-column green/yellow services table.
                  </p>
                </div>
              </div>
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                templateFormat === 'Legacy' ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 bg-white'
              }`}>
                {templateFormat === 'Legacy' && <CheckCircle2 size={13} className="text-white" />}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Legacy Configuration Section */}
        {templateFormat === 'Legacy' && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 transition-all">
            <div className="flex items-center gap-2 border-b border-amber-200/80 pb-2.5">
              <Layers size={16} className="text-amber-700" />
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Legacy Proposal Details (Admin Inputs)
              </h4>
              <span className="ml-auto text-[11px] font-semibold text-amber-700">Inputs required for 2-page proposal format</span>
            </div>

            <div className="mt-3.5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Tech Stack <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  value={legacyMeta.techStack}
                  onChange={(e) => updateLegacyMeta('techStack', e.target.value)}
                  placeholder="e.g. Flutter & Kotlin | AWS Cloud Server"
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-slate-500">Displayed on Page 1 in the Project & Tech Stack box.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Estimated Delivery Timeline <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  value={legacyMeta.deliveryTimeline}
                  onChange={(e) => updateLegacyMeta('deliveryTimeline', e.target.value)}
                  placeholder="e.g. Every Week based on requirements finalization..."
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-slate-500">Shown in Page 1 Commercial Summary (B. Delivery Timeline).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Payment Terms (1 line per milestone/stage) <span className="text-amber-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={legacyMeta.paymentTerms}
                  onChange={(e) => updateLegacyMeta('paymentTerms', e.target.value)}
                  placeholder="70% Advance&#10;15% Development Stages on every Milestones&#10;15% Final Delivery"
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 shadow-2xs resize-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">Rendered under A. Payment Terms on Page 1.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Bit Byte Contact Person <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={legacyMeta.contactPersons}
                  onChange={(e) => updateLegacyMeta('contactPersons', e.target.value)}
                  placeholder="e.g. Mr. Arun. (Head – Operations)"
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-slate-500">Optional: Displayed under Company Details on Page 1 if entered.</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
              <label className="text-xs font-bold uppercase text-slate-400">Mobile Number</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={customClient.countryCode || '+91'}
                  onChange={(e) => setCustomClient({ ...customClient, countryCode: e.target.value })}
                  className="w-28 rounded-xl border border-line bg-white px-2 py-2 text-xs font-bold outline-purple"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={customClient.phone}
                  onChange={(e) => setCustomClient({ ...customClient, phone: e.target.value })}
                  className="flex-1 rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                  placeholder="e.g. 7339201392"
                />
              </div>
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
                    setCustomServiceDescription('');
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

        {/* Service Description input (editable for all services) */}
        {(activeServiceObj || isCustomService) && (
          <div className="mt-4 border-t border-line pt-4">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
              <span>Service Description <span className="text-[11px] font-semibold text-purple normal-case">(Editable)</span></span>
              <span className="text-[11px] font-semibold text-slate-400 normal-case">Optional — leave blank if not needed</span>
            </label>
            <textarea
              rows={2}
              value={customServiceDescription}
              onChange={(e) => setCustomServiceDescription(e.target.value)}
              placeholder="Enter description, scope, or deliverables for this service (optional)..."
              className="w-full rounded-xl border border-line bg-white p-3 text-sm font-medium text-slate-800 outline-purple placeholder:text-slate-400 focus:border-purple focus:ring-1 focus:ring-purple"
            />
          </div>
        )}

        {/* Live Service Details & Pricing Preview Box */}
        {(activeServiceObj || isCustomService) && (
          <div className="mt-5 rounded-2xl border border-purple/20 bg-gradient-to-b from-purple/5 via-white/70 to-purple/5 p-5 shadow-sm space-y-5">
            {/* ── TOP: Service Header (Pills, Title, Tier/Description) ── */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 pb-3 border-b border-purple/10">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple/15 px-3 py-1 text-xs font-black text-purple">
                    {isCustomService ? 'Custom Service' : activeServiceObj.module}
                  </span>
                  {!isCustomService && (
                    <>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                        SAC {activeServiceObj.sacCode}
                      </span>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {activeServiceObj.unit} · {activeServiceObj.frequency}
                      </span>
                    </>
                  )}
                  {isCustomService && (
                    <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                      Manual Entry
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-black text-slate-950">
                  {isCustomService ? (customServiceName || 'Enter custom service name above') : activeServiceObj.service}
                </h3>
                {isCustomService ? (
                  customServiceDescription.trim() ? (
                    <p className="mt-1 text-xs font-medium text-slate-600">{customServiceDescription.trim()}</p>
                  ) : null
                ) : (
                  <p className="mt-1 text-xs font-medium text-slate-600">{currentTierNote}</p>
                )}
              </div>
            </div>

            {/* ── MIDDLE: FULL-WIDTH SPECIAL SERVICE CONFIGURATORS ── */}

            {/* Configurator: Service 24 — Module Images */}
            {isModuleService && (
              <div className="w-full rounded-2xl border border-purple/30 bg-gradient-to-br from-purple/10 to-purple/5 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple px-3 py-1 text-xs font-black text-white shadow-sm">📦 Module Configuration</span>
                    <span className="text-xs font-bold text-purple-950">Module-based Pricing</span>
                  </div>
                  <span className="rounded-lg bg-purple/15 px-2.5 py-1 text-xs font-bold text-purple">
                    Min 2 modules · Max 10 modules · Up to 15 images/module
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Module Count */}
                  <div className="rounded-xl border border-purple/20 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-purple">📐 Number of Modules</label>
                      <span className="text-xs font-bold text-slate-500">{currency(currentTierPrice)} / module</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setModuleCount((c) => Math.max(2, Number(c) - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-purple/30 bg-purple/10 font-black text-purple text-lg hover:bg-purple hover:text-white transition-all shadow-xs"
                      >−</button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-black text-slate-950">{moduleCount}</span>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{moduleCount} × {currency(currentTierPrice)} = {currency(currentTierPrice * Number(moduleCount))}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModuleCount((c) => Math.min(10, Number(c) + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-purple/30 bg-purple/10 font-black text-purple text-lg hover:bg-purple hover:text-white transition-all shadow-xs"
                      >+</button>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={10}
                      step={1}
                      value={moduleCount}
                      onChange={(e) => setModuleCount(Number(e.target.value))}
                      className="mt-3 w-full accent-purple h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>2 min</span><span>10 max</span>
                    </div>
                  </div>
                  {/* Images per Module */}
                  <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-emerald-700">🖼️ Images per Module</label>
                      <span className="text-xs font-bold text-emerald-600">{imagesPerModule * moduleCount} Total Images</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setImagesPerModule((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-emerald-200 bg-emerald-50 font-black text-emerald-700 text-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-xs"
                      >−</button>
                      <div className="flex-1 text-center">
                        <span className="text-3xl font-black text-slate-950">{imagesPerModule}</span>
                        <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{imagesPerModule} images × {moduleCount} module{moduleCount > 1 ? 's' : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImagesPerModule((c) => Math.min(15, Number(c) + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-emerald-200 bg-emerald-50 font-black text-emerald-700 text-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-xs"
                      >+</button>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={imagesPerModule}
                      onChange={(e) => setImagesPerModule(Number(e.target.value))}
                      className="mt-3 w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                      <span>1 min</span><span>15 max</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Configurator: Service 23 — Changes */}
            {isChangesService && (
              <div className="w-full rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-sm">✏️ Change Pack Configuration</span>
                  <span className="text-xs font-semibold text-slate-500">Max 15 changes after initial setup (Starter tier)</span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-amber-800">🔧 Number of Changes</label>
                      <p className="text-xs text-slate-500 mt-0.5">Define allowed scope changes after deployment</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setChangesCount((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-300 bg-amber-50 font-black text-amber-700 text-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-xs"
                      >−</button>
                      <div className="min-w-[100px] text-center">
                        <span className="text-3xl font-black text-slate-950">{changesCount}</span>
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">of 15 max changes</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChangesCount((c) => Math.min(15, Number(c) + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-300 bg-amber-50 font-black text-amber-700 text-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-xs"
                      >+</button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={changesCount}
                    onChange={(e) => setChangesCount(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                    <span>1 min</span><span>15 max</span>
                  </div>
                </div>
              </div>
            )}

            {/* Configurator: Service 53 — WhatsApp Automation Customization */}
            {isWhatsAppCustomization && !isComplimentaryItem && (
              <div className="w-full rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-sm">📱 WhatsApp Automation Customization</span>
                    <span className="text-xs font-bold text-emerald-950">Custom Flow Setup</span>
                  </div>
                  <span className="rounded-lg bg-emerald-100/80 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    Base ₹9,990 (up to 15 categories) · +₹2,990 / extra category
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-emerald-800">📋 Number of Categories</label>
                      <p className="text-xs text-slate-500 mt-0.5">Select chatbot menu categories & response paths</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setWhatsappCategoryCount((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 font-black text-emerald-700 text-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-xs"
                      >−</button>
                      <div className="min-w-[120px] text-center">
                        <span className="text-3xl font-black text-slate-950">{whatsappCategoryCount}</span>
                        <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
                          {whatsappCategoryCount <= 15
                            ? 'Included in base price'
                            : `15 Base + ${whatsappCategoryCount - 15} Extra (+${currency((whatsappCategoryCount - 15) * 2990)})`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappCategoryCount((c) => Math.min(50, Number(c) + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 font-black text-emerald-700 text-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-xs"
                      >+</button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    value={whatsappCategoryCount}
                    onChange={(e) => setWhatsappCategoryCount(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                    <span>1 min</span><span>15 base included</span><span>40 max</span>
                  </div>
                </div>
              </div>
            )}

            {/* Configurator: Service 55 — ERP, CRM, PRM, HRMS */}
            {isErpCrmService && !isComplimentaryItem && (
              <div className="w-full rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white shadow-sm">🏢 ERP, CRM, PRM, HRMS App Suite</span>
                    <span className="text-xs font-bold text-indigo-950">Modular Enterprise Suite</span>
                  </div>
                  <span className="rounded-lg bg-indigo-100/80 px-2.5 py-1 text-xs font-bold text-indigo-800">
                    Base ₹39,990 (up to 6 modules) · +₹6,990 / extra module
                  </span>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-indigo-900">📦 Number of App Modules</label>
                      <p className="text-xs text-slate-500 mt-0.5">Select business modules (CRM, ERP, HRMS, Inventory, Billing, etc.)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setErpModuleCount((c) => Math.max(1, Number(c) - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 font-black text-indigo-700 text-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-xs"
                      >−</button>
                      <div className="min-w-[120px] text-center">
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
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 font-black text-indigo-700 text-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-xs"
                      >+</button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={erpModuleCount}
                    onChange={(e) => setErpModuleCount(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
                    <span>1 min</span><span>6 base included</span><span>20 max</span>
                  </div>
                </div>
              </div>
            )}

            {/* Configurator: Services 7 & 8 — AI Video Seconds */}
            {isAiVideoService && !isComplimentaryItem && (
              <div className="w-full rounded-2xl border border-pink-300/80 bg-gradient-to-br from-pink-50/80 via-white to-purple-50/60 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-pink-600 px-3 py-1 text-xs font-black text-white shadow-sm">🎬 AI Video Duration (Customisable)</span>
                    <span className="text-xs font-bold text-pink-950">AI Video Generation</span>
                  </div>
                  <span className="rounded-lg bg-pink-100/80 px-2.5 py-1 text-xs font-bold text-pink-800">
                    Enter or select video length in seconds
                  </span>
                </div>
                <div className="rounded-xl border border-pink-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-pink-800">⏱️ Video Duration (Seconds)</label>
                      <p className="text-xs text-slate-500 mt-0.5">Select standard duration or enter custom runtime</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setVideoSeconds((s) => Math.max(1, Number(s || 8) - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-pink-300 bg-pink-50 font-black text-pink-700 text-lg hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-all shadow-xs"
                      >−</button>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={600}
                          value={videoSeconds}
                          onChange={(e) => setVideoSeconds(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                          onBlur={() => { if (!videoSeconds || Number(videoSeconds) < 1) setVideoSeconds(8); }}
                          className="w-20 rounded-xl border-2 border-pink-300 bg-pink-50/40 px-2 py-1 text-center text-xl font-black text-slate-950 outline-none focus:border-pink-500 shadow-xs"
                        />
                        <span className="text-xs font-black text-pink-700">Seconds</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVideoSeconds((s) => Math.min(600, Number(s || 8) + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-pink-300 bg-pink-50 font-black text-pink-700 text-lg hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-all shadow-xs"
                      >+</button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-pink-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Quick Presets:</span>
                    {[8, 12, 16, 20, 24, 30, 45, 60].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setVideoSeconds(preset)}
                        className={`rounded-lg px-3 py-1 text-xs font-black transition-all border ${
                          Number(videoSeconds) === preset
                            ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                            : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
                        }`}
                      >
                        {preset}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── BOTTOM: ACTION & PRICING BAR ── */}
            <div className="pt-3 border-t border-purple/15 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              {/* Left Side: Inputs & Option Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Price input — manual/custom/override */}
                {!isComplimentaryItem && (isCustomService || priceOverrideEnabled || selectedTier === 'customised' || activeServiceObj?.frequency === 'Yearly' || activeServiceObj?.service?.toLowerCase().includes('amc')) && (
                  <div className="flex flex-col">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
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
                      step="any"
                      value={customBasePrice}
                      onChange={(e) => handleCustomPriceChange(e.target.value)}
                      onBlur={handleCustomPriceBlur}
                      className={`w-36 rounded-xl border-2 px-3 py-2 text-center text-sm font-black text-slate-900 shadow-xs transition-colors outline-none ${
                        priceOverrideEnabled
                          ? 'border-orange-400 bg-orange-50 focus:border-orange-500'
                          : 'border-purple bg-purple/10 hover:border-purple-600 focus:border-purple-600'
                      }`}
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Qty */}
                <div className="flex flex-col">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-16 rounded-xl border border-line bg-white px-2 py-2 text-center text-sm font-bold shadow-xs outline-none focus:border-purple focus:ring-1 focus:ring-purple"
                    disabled={isModuleService || isChangesService}
                    title={isModuleService ? 'Qty is set by module count' : isChangesService ? 'Qty is set by changes count' : ''}
                  />
                </div>

                {/* Discount % */}
                <div className="flex flex-col">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={itemDiscount}
                    onChange={(e) => setItemDiscount(e.target.value)}
                    disabled={isComplimentaryItem}
                    className={`w-20 rounded-xl border border-line bg-white px-2 py-2 text-center text-sm font-bold shadow-xs outline-none focus:border-purple focus:ring-1 focus:ring-purple ${
                      isComplimentaryItem ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                {/* Optional Suggestion */}
                <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100/80 px-3.5 py-2.5 rounded-xl border border-amber-200 text-amber-900 transition-colors shadow-xs self-end">
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

                {/* Complimentary */}
                <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-2.5 rounded-xl border border-emerald-300 text-emerald-900 transition-colors shadow-xs self-end">
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
                  <span className="text-xs font-bold whitespace-nowrap">🎁 Complimentary (Free)</span>
                </label>
              </div>

              {/* Right Side: Rate & Add Service Button */}
              <div className="flex items-center justify-between xl:justify-end gap-5 pt-2 xl:pt-0 border-t xl:border-t-0 border-purple/10">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 flex items-center justify-end gap-1.5">
                    {isComplimentaryItem
                      ? (isErpCrmService ? 'Suite Value' : isWhatsAppCustomization ? 'Customization Value' : isModuleService ? 'Service Value' : 'Service Value')
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
                    {/* Edit price button */}
                    {!isComplimentaryItem && !isCustomService && !isModuleService && !isWhatsAppCustomization && !isErpCrmService && selectedTier !== 'customised' && activeServiceObj?.frequency !== 'Yearly' && !activeServiceObj?.service?.toLowerCase().includes('amc') && (
                      <button
                        type="button"
                        title={priceOverrideEnabled ? 'Reset to tier price' : 'Override default price'}
                        onClick={() => {
                          if (priceOverrideEnabled) {
                            setPriceOverrideEnabled(false);
                            setCustomBasePrice(Number(activeServiceObj?.prices?.[selectedTier] || 0));
                          } else {
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
                  <p className={`text-2xl font-black ${isComplimentaryItem ? 'text-emerald-600' : 'text-purple'}`}>
                    {currency(
                      isModuleService
                        ? currentTierPrice * Number(moduleCount)
                        : (isCustomService || selectedTier === 'customised' || priceOverrideEnabled)
                        ? Number(customBasePrice || 0)
                        : currentTierPrice
                    )}
                  </p>
                  {isComplimentaryItem && (
                    <p className="text-[10px] text-emerald-700 font-bold">🎁 Complimentary (Free · Not Billed)</p>
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
                    className={`flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 transition-all duration-300 ${
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
                    className="gradient-button flex h-11 items-center gap-2 rounded-xl px-6 font-black text-white shadow-md hover:shadow-lg transition-all"
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
                <th className="p-3 text-center">Timeline</th>
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
                        {item.videoSeconds > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200">
                            🎬 {item.videoSeconds}s video
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateCostingItemDescription(item.tempId, e.target.value)}
                        placeholder="Service description (optional)..."
                        className="mt-1.5 w-full rounded-lg border border-line bg-slate-50/70 px-2.5 py-1 text-xs font-medium text-slate-600 outline-purple focus:border-purple focus:bg-white"
                      />
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{item.sacCode}</span>
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="text"
                        value={item.timeline || 'One-Time'}
                        onChange={(e) => updateCostingItemTimeline(item.tempId, e.target.value)}
                        placeholder="One-Time"
                        className="w-24 rounded-lg border border-line bg-slate-50/70 px-2 py-1 text-center text-xs font-semibold text-slate-700 outline-purple focus:border-purple focus:bg-white"
                        title="Service Delivery Timeline"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <span className={`rounded px-2.5 py-1 text-xs font-black ${
                        item.isComplimentary ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-purple/10 text-purple'
                      }`}>
                        {item.isComplimentary ? '🎁 Complimentary' : item.tier}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{currency(item.basePrice)}</td>
                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                    <td className="p-3 text-right">
                      {item.isComplimentary ? (
                        <span className="text-emerald-700 font-bold text-xs">100% Free</span>
                      ) : item.discountPercentage > 0 ? (
                        <span className="text-red-600 font-bold">
                          {item.discountPercentage}%
                          <span className="block text-[10px] text-red-400">-{currency(item.discountAmount)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold">{currency(item.taxableValue)}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">
                      {item.isComplimentary ? <span className="text-slate-400">₹0.00</span> : currency(item.gstAmount)}
                    </td>
                    <td className="p-3 text-right font-black">
                      {item.isComplimentary ? (
                        <div>
                          <span className="text-emerald-700 font-black">₹0.00</span>
                          <span className="block text-[10px] font-bold text-emerald-600">[Complimentary]</span>
                        </div>
                      ) : (
                        <span className="text-purple">{currency(item.totalAmount)}</span>
                      )}
                    </td>
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
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Sparkles className="mx-auto mb-2 text-slate-300" size={32} />
                    <p className="text-sm font-bold text-slate-600">No services selected yet</p>
                    <p className="text-xs text-slate-400">Use the 3-tier dropdown selector above to add services.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary & Overall Discount Controls */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] items-start">
          <div className="space-y-4">
            {/* Overall Quotation Discount Control Box */}
            <div className="rounded-2xl border border-purple/20 bg-gradient-to-br from-purple/5 via-white to-slate-50 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900">🏷️ Overall Quotation Discount</span>
                  <span className="text-[10px] font-bold text-purple bg-purple/10 px-2 py-0.5 rounded-full">Special Pricing</span>
                </div>
                {totals.discountAmount > 0 && (
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    -{currency(totals.discountAmount)} Savings
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Discount Type</label>
                  <select
                    value={overallDiscount.type}
                    onChange={(e) => setOverallDiscount({ type: e.target.value, value: e.target.value === 'None' ? '' : overallDiscount.value })}
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-purple"
                  >
                    <option value="None">No Discount (Standard)</option>
                    <option value="Percentage">Percentage Discount (%)</option>
                    <option value="Fixed Amount">Fixed Amount Discount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {overallDiscount.type === 'Percentage' ? 'Discount Percentage (%)' : overallDiscount.type === 'Fixed Amount' ? 'Discount Amount (₹)' : 'Value'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={overallDiscount.type === 'Percentage' ? 100 : totals.subtotal}
                    disabled={overallDiscount.type === 'None'}
                    value={overallDiscount.value}
                    onChange={(e) => setOverallDiscount(p => ({ ...p, value: e.target.value }))}
                    placeholder={overallDiscount.type === 'Percentage' ? 'e.g. 10 for 10%' : overallDiscount.type === 'Fixed Amount' ? 'e.g. 5000' : 'Select type first'}
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-purple disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {totals.discountAmount > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-purple/10 pt-3 text-xs">
                  <span className="text-slate-600">Base: <strong>{currency(totals.subtotal)}</strong></span>
                  <span className="text-red-600 font-bold">Discount: -{currency(totals.discountAmount)} ({overallDiscount.type === 'Percentage' ? `${overallDiscount.value}%` : 'Flat'})</span>
                  <span className="text-slate-900 font-bold">Net Taxable: {currency(totals.netTaxable)}</span>
                </div>
              )}
            </div>

            {/* Terms & Conditions & Payment Milestones */}
            <div className="rounded-2xl border border-line bg-white p-5 text-xs text-slate-500 space-y-2 shadow-sm">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Payment Milestones (Terms & Conditions):</p>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                <div className="rounded-xl border border-purple/20 bg-purple/5 p-2.5">
                  <p className="text-[10px] font-bold text-purple uppercase">Stage 1 · 70%</p>
                  <p className="font-black text-slate-900 mt-0.5">{currency(Math.round(totals.grandTotal * 0.70))}</p>
                  <p className="text-[9px] text-slate-500">Initial Payment</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Stage 2 · 15%</p>
                  <p className="font-black text-slate-900 mt-0.5">{currency(Math.round(totals.grandTotal * 0.15))}</p>
                  <p className="text-[9px] text-slate-500">Client Checking</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Stage 3 · 15%</p>
                  <p className="font-black text-slate-900 mt-0.5">{currency(Math.max(0, totals.grandTotal - Math.round(totals.grandTotal * 0.70) - Math.round(totals.grandTotal * 0.15)))}</p>
                  <p className="text-[9px] text-slate-500">Final Handover</p>
                </div>
              </div>
              <p className="pt-1 text-[11px] text-slate-400">• Standard GST of 18% is calculated on the net taxable amount after discount.</p>
            </div>
          </div>

          <AmountSummaryCard
            subtotal={totals.netTaxable}
            gst={totals.gst}
            paid={0}
            originalSubtotal={totals.discountAmount > 0 ? totals.subtotal : null}
            discount={totals.discountAmount}
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
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500">Mobile Number *</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={quickClientModal.countryCode || '+91'}
                  onChange={e => setQuickClientModal(p => ({ ...p, countryCode: e.target.value }))}
                  className="w-28 rounded-xl border border-line bg-white px-2 py-2 text-xs font-bold outline-purple"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={quickClientModal.phone}
                  onChange={e => setQuickClientModal(p => ({ ...p, phone: e.target.value }))}
                  className="flex-1 rounded-xl border border-line px-3 py-2 text-sm font-semibold outline-purple"
                  placeholder="9876543210"
                />
              </div>
            </div>
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
