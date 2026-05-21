export const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const recordId = (record) => record?._id || record?.id;

export const getClientName = (record) =>
  record?.clientId?.companyName ||
  record?.clientId?.fullName ||
  record?.client?.companyName ||
  record?.client?.fullName ||
  '-';

export const getQuotationNumber = (record) =>
  record?.quotationId?.quotationId || record?.quotationId || '-';

export const getInvoiceNumber = (record) =>
  record?.invoiceId?.invoiceId || record?.invoiceId || '-';

export const serviceNames = (services = []) =>
  services.map((service) => service?.name || service).filter(Boolean).join(', ');
