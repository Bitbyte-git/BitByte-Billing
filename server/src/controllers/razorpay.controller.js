import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import InternInvoice from '../models/InternInvoice.js';
import Payment from '../models/Payment.js';
import { recalculateInvoicePayments } from './payment.controller.js';
import { internInvoiceTotalAmount } from '../services/internInvoiceService.js';
import { createRazorpayOrder, getRazorpayKeyId, verifyRazorpaySignature } from '../services/razorpayService.js';
import { sendClientWorkflowEmail } from '../utils/clientEmail.js';
import { nextPaymentId } from '../utils/idGenerator.js';

function invoiceLookup(id) {
  const clauses = [{ invoiceId: id }, { internId: id }];
  if (mongoose.isValidObjectId(id)) clauses.push({ _id: id });
  return { $or: clauses };
}

function pendingClientAmount(invoice) {
  return Number(invoice.balanceDue ?? Math.max(Number(invoice.totalAmount || 0) - Number(invoice.amountPaid || 0), 0));
}

function clientPaymentPayload({ invoice, order }) {
  return {
    keyId: getRazorpayKeyId(),
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    name: 'Bit Byte Technologies',
    description: `Payment for ${invoice.invoiceId}`,
    prefill: {
      name: invoice.clientId?.companyName || invoice.clientId?.fullName || '',
      email: invoice.clientId?.email || '',
      contact: invoice.clientId?.phone || '',
    },
  };
}

function internPaymentPayload({ invoice, order }) {
  return {
    keyId: getRazorpayKeyId(),
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    name: 'Bit Byte Technologies',
    description: `Payment for ${invoice.invoiceId || invoice.internId}`,
    prefill: {
      name: invoice.employeeName || '',
      email: invoice.email || '',
      contact: invoice.phone || '',
    },
  };
}

export async function createClientInvoiceRazorpayOrder(req, res, next) {
  try {
    const invoice = await Invoice.findOne(invoiceLookup(req.params.id)).populate('clientId quotationId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const pendingAmount = pendingClientAmount(invoice);
    if (pendingAmount <= 0) {
      return res.status(422).json({ message: 'This invoice has no pending amount' });
    }

    let payment = await Payment.findOne({
      invoiceId: invoice._id,
      paymentStatus: { $in: ['Pending', 'Failed'] },
    }).sort({ paymentStageOrder: 1, createdAt: 1 });

    if (!payment) {
      const existingCount = await Payment.countDocuments({ invoiceId: invoice._id });
      payment = await Payment.create({
        paymentId: await nextPaymentId(),
        invoiceId: invoice._id,
        quotationId: invoice.quotationId,
        clientId: invoice.clientId,
        paymentLabel: `Online Payment ${existingCount + 1}`,
        paymentStageOrder: existingCount + 1,
        amount: pendingAmount,
        paymentMethod: 'Razorpay',
        status: 'Pending',
        paymentStatus: 'Pending',
      });
    }

    const order = await createRazorpayOrder({
      amount: pendingAmount,
      receipt: payment.paymentId,
      notes: {
        type: 'client-invoice',
        invoiceId: invoice.invoiceId,
        paymentId: payment.paymentId,
      },
    });

    payment.amount = pendingAmount;
    payment.paymentMethod = 'Razorpay';
    payment.gateway = 'Razorpay';
    payment.razorpayOrderId = order.id;
    payment.razorpayPaymentId = '';
    payment.razorpaySignature = '';
    payment.transactionReference = '';
    payment.paymentStatus = 'Pending';
    payment.status = 'Pending';
    await payment.save();

    res.json(clientPaymentPayload({ invoice, order }));
  } catch (err) {
    next(err);
  }
}

export async function createInternInvoiceRazorpayOrder(req, res, next) {
  try {
    const invoice = await InternInvoice.findOne(invoiceLookup(req.params.id));
    if (!invoice) return res.status(404).json({ message: 'Intern invoice not found' });
    if (invoice.paymentReceived) {
      return res.status(422).json({ message: 'This intern invoice is already paid' });
    }

    const pendingAmount = internInvoiceTotalAmount(invoice.amount);
    if (pendingAmount <= 0) {
      return res.status(422).json({ message: 'This intern invoice has no pending amount' });
    }

    const order = await createRazorpayOrder({
      amount: pendingAmount,
      receipt: invoice.invoiceId || invoice.internId,
      notes: {
        type: 'intern-invoice',
        invoiceId: invoice.invoiceId || '',
        internId: invoice.internId || '',
      },
    });

    invoice.paymentMethod = 'Razorpay';
    invoice.razorpayOrderId = order.id;
    invoice.razorpayPaymentId = '';
    invoice.razorpaySignature = '';
    await invoice.save();

    res.json(internPaymentPayload({ invoice, order }));
  } catch (err) {
    next(err);
  }
}

export async function verifyRazorpayPayment(req, res, next) {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    if (!orderId || !paymentId || !signature) {
      return res.status(422).json({ message: 'Razorpay payment verification details are required' });
    }

    const payment = await Payment.findOne({ razorpayOrderId: orderId }).populate('invoiceId quotationId clientId');
    if (payment) {
      if (!verifyRazorpaySignature({ orderId: payment.razorpayOrderId, paymentId, signature })) {
        return res.status(400).json({ message: 'Razorpay signature verification failed' });
      }

      if (payment.paymentStatus !== 'Paid') {
        payment.paymentStatus = 'Paid';
        payment.status = 'Paid';
        payment.paymentMethod = 'Razorpay';
        payment.gateway = 'Razorpay';
        payment.razorpayPaymentId = paymentId;
        payment.razorpaySignature = signature;
        payment.transactionReference = paymentId;
        payment.paymentDate = new Date();
        await payment.save();

        const invoice = await recalculateInvoicePayments(payment.invoiceId, null);
        await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Payment Paid', payment });
        if (invoice.paymentStatus === 'Paid') {
          await sendClientWorkflowEmail({ quotationId: payment.quotationId, invoiceId: payment.invoiceId, stage: 'Final Payment Completed', payment });
        }
      }

      return res.json({ message: 'Payment verified successfully', targetType: 'client-invoice' });
    }

    const internInvoice = await InternInvoice.findOne({ razorpayOrderId: orderId });
    if (internInvoice) {
      if (!verifyRazorpaySignature({ orderId: internInvoice.razorpayOrderId, paymentId, signature })) {
        return res.status(400).json({ message: 'Razorpay signature verification failed' });
      }

      internInvoice.paymentReceived = true;
      internInvoice.paymentMethod = 'Razorpay';
      internInvoice.razorpayPaymentId = paymentId;
      internInvoice.razorpaySignature = signature;
      if (!internInvoice.paymentId) internInvoice.paymentId = paymentId;
      await internInvoice.save();

      return res.json({ message: 'Intern payment verified successfully', targetType: 'intern-invoice' });
    }

    return res.status(404).json({ message: 'Razorpay order not found in billing system' });
  } catch (err) {
    next(err);
  }
}
