import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';
import { changeQuotationStatus } from '../services/workflowService.js';
import { nextPaymentId } from '../utils/idGenerator.js';

export async function listPayments(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = client ? { clientId: client._id } : {};
    res.json(await Payment.find(query).populate('invoiceId quotationId clientId').sort({ paymentDate: -1 }));
  } catch (err) { next(err); }
}

export async function createPayment(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.body.invoiceId);
    const payment = await Payment.create({ ...req.body, paymentId: await nextPaymentId(), quotationId: invoice.quotationId, clientId: invoice.clientId });
    invoice.amountPaid += Number(payment.amount);
    invoice.balanceDue = Math.max(invoice.totalAmount - invoice.amountPaid, 0);
    invoice.paymentStatus = invoice.balanceDue === 0 ? 'Paid' : 'Partial';
    await invoice.save();
    if (invoice.paymentStatus === 'Paid') {
      const quotation = await Quotation.findById(invoice.quotationId);
      await changeQuotationStatus({ quotation, status: 'Paid', user: req.user });
    }
    res.status(201).json(payment);
  } catch (err) { next(err); }
}

export async function updatePayment(req, res, next) {
  try { res.json(await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })); } catch (err) { next(err); }
}
