import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';

export async function dashboard(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
    const [quotations, invoices, payments] = await Promise.all([Quotation.find(query), Invoice.find(query), Payment.find(query)]);
    const paidPayments = payments.filter((payment) => payment.status === 'Paid');
    const statusList = ['Submitted', 'Under Review', 'Needs Clarification', 'Forwarded to Admin', 'Approved', 'Rejected', 'Invoice Generated', 'Paid'];
    const statusDistribution = statusList.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
    quotations.forEach((item) => { statusDistribution[item.status] = (statusDistribution[item.status] || 0) + 1; });
    const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return date.toLocaleString('en-IN', { month: 'short' });
    });
    const revenueByMonth = lastSixMonths.reduce((acc, month) => ({ ...acc, [month]: 0 }), {});
    paidPayments.forEach((payment) => {
      const date = payment.paymentDate ? new Date(payment.paymentDate) : new Date(payment.updatedAt || payment.createdAt || Date.now());
      const key = date.toLocaleString('en-IN', { month: 'short' });
      revenueByMonth[key] = (revenueByMonth[key] || 0) + Number(payment.amount || 0);
    });
    res.json({
      totalQuotations: quotations.length,
      totalValue: quotations.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
      totalRevenue: paidPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      outstandingAmount: invoices.reduce((sum, item) => sum + Number(item.balanceDue || 0), 0),
      pendingAmount: payments.filter((payment) => payment.status !== 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paidPayments: paidPayments.length,
      pendingPayments: payments.filter((payment) => payment.status !== 'Paid').length,
      totalInvoices: invoices.length,
      statusDistribution,
      revenueByMonth,
      monthlyAnalytics: revenueByMonth
    });
  } catch (err) { next(err); }
}

export const revenue = dashboard;
export const quotationReport = dashboard;
export const paymentReport = dashboard;
