import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import InternInvoice from '../models/InternInvoice.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';

const pad = (number) => String(number).padStart(4, '0');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function nextSequentialId(Model, field, prefix) {
  const regex = new RegExp(`^${escapeRegex(prefix)}\\d+$`);
  const records = await Model.find({ [field]: regex }).select(field).lean();
  const max = records.reduce((highest, record) => {
    const match = String(record[field] || '').match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) && value > highest ? value : highest;
  }, 0);

  return `${prefix}${pad(max + 1)}`;
}

export async function nextClientId() {
  return nextSequentialId(Client, 'clientId', 'BBT-CLI-');
}

export async function nextQuotationId() {
  const year = new Date().getFullYear();
  return nextSequentialId(Quotation, 'quotationId', `BBT-QT-${year}-`);
}

export async function nextInvoiceId() {
  const year = new Date().getFullYear();
  return nextSequentialId(Invoice, 'invoiceId', `BBT-INV-${year}-`);
}

export async function nextInternInvoiceId() {
  const year = new Date().getFullYear();
  return nextSequentialId(InternInvoice, 'invoiceId', `BBT-INT-INV-${year}-`);
}

export async function nextInternPaymentId() {
  const year = new Date().getFullYear();
  return nextSequentialId(InternInvoice, 'paymentId', `BBT-INT-PAY-${year}-`);
}

export async function nextInternId() {
  const year = new Date().getFullYear();
  return nextSequentialId(InternInvoice, 'internId', `BBT-INT-${year}-`);
}

export async function nextPaymentId() {
  return nextSequentialId(Payment, 'paymentId', 'PAY-');
}
