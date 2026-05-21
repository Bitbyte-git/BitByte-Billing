import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';

export async function dashboard(_req, res, next) {
  try {
    const [quotations, invoices, payments] = await Promise.all([Quotation.find(), Invoice.find(), Payment.find()]);
    res.json({
      totalQuotations: quotations.length,
      totalValue: quotations.reduce((sum, item) => sum + item.totalAmount, 0),
      totalRevenue: payments.reduce((sum, item) => sum + item.amount, 0),
      outstandingAmount: invoices.reduce((sum, item) => sum + item.balanceDue, 0),
      statusDistribution: quotations.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {})
    });
  } catch (err) { next(err); }
}

export const revenue = dashboard;
export const quotationReport = dashboard;
export const paymentReport = dashboard;
