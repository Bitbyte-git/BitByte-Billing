import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Quotation from '../models/Quotation.js';
import { changeQuotationStatus } from '../services/workflowService.js';
import { nextPaymentId } from '../utils/idGenerator.js';

export async function listPayments(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
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
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const wasPending = payment.status !== 'Paid';
    const isNowPaid = req.body.status === 'Paid';

    Object.assign(payment, req.body);

    if (wasPending && isNowPaid) {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        // If payment was recorded without an amount (e.g. pending full payment), capture the full balance
        if (payment.amount === 0) {
          payment.amount = invoice.balanceDue;
        }

        invoice.amountPaid += Number(payment.amount);
        invoice.balanceDue = Math.max(invoice.totalAmount - invoice.amountPaid, 0);
        invoice.paymentStatus = invoice.balanceDue === 0 ? 'Paid' : 'Partial';
        await invoice.save();

        if (invoice.paymentStatus === 'Paid') {
          const quotation = await Quotation.findById(invoice.quotationId);
          if (quotation) {
            await changeQuotationStatus({ quotation, status: 'Paid', user: req.user });
          }
        }
      }
    }
    
    await payment.save();
    res.json(payment);
  } catch (err) { next(err); }
}
