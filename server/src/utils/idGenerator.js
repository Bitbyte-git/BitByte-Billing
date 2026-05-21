import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';

const pad = (number) => String(number).padStart(4, '0');

export async function nextClientId() {
  return `BBT-CLI-${pad(await Client.countDocuments() + 1)}`;
}

export async function nextQuotationId() {
  const year = new Date().getFullYear();
  return `BBT-QT-${year}-${pad(await Quotation.countDocuments({ quotationId: new RegExp(`BBT-QT-${year}`) }) + 1)}`;
}

export async function nextInvoiceId() {
  const year = new Date().getFullYear();
  return `BBT-INV-${year}-${pad(await Invoice.countDocuments({ invoiceId: new RegExp(`BBT-INV-${year}`) }) + 1)}`;
}

export async function nextPaymentId() {
  return `PAY-${pad(await Payment.countDocuments() + 1)}`;
}
