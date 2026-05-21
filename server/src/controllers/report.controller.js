import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';

export async function dashboard(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
    const [quotations, invoices, payments] = await Promise.all([Quotation.find(query), Invoice.find(query), Payment.find(query)]);
    const revenueByMonth = payments.reduce((acc, payment) => {
      const date = payment.paymentDate ? new Date(payment.paymentDate) : null;
      const key = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-IN', { month: 'short' }) : 'Unpaid';
      return { ...acc, [key]: (acc[key] || 0) + Number(payment.amount || 0) };
    }, {});
    res.json({
      totalQuotations: quotations.length,
      totalValue: quotations.reduce((sum, item) => sum + item.totalAmount, 0),
      totalRevenue: payments.reduce((sum, item) => sum + item.amount, 0),
      outstandingAmount: invoices.reduce((sum, item) => sum + item.balanceDue, 0),
      statusDistribution: quotations.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {}),
      revenueByMonth
    });
  } catch (err) { next(err); }
}

export const revenue = dashboard;
export const quotationReport = dashboard;
export const paymentReport = dashboard;
