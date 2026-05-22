import Client from '../models/Client.js';
import Invoice from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';
import { sendNotificationEmail } from './email.js';

export async function sendClientWorkflowEmail({ quotationId, invoiceId, stage, payment, adminRemarks }) {
  try {
    const invoice = invoiceId ? await Invoice.findById(invoiceId).populate('clientId quotationId') : null;
    const quotation = quotationId
      ? await Quotation.findById(quotationId).populate('clientId')
      : invoice?.quotationId;
    const client = invoice?.clientId || quotation?.clientId || (quotation?.clientId ? await Client.findById(quotation.clientId) : null);
    if (!client?.email) return;
    const baseUrl = process.env.CLIENT_URL || process.env.APP_URL || '';
    const reviewUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/client/dashboard` : '/client/dashboard';
    const remaining = invoice ? invoice.balanceDue : quotation?.totalAmount;
    const paymentLine = payment
      ? `\nPayment: ${payment.paymentLabel || 'Payment'} | Amount: Rs ${payment.amount || 0} | Status: ${payment.status || payment.paymentStatus || '-'}`
      : '';
    const text = [
      'Bit Byte Technologies',
      '',
      `Hello ${client.fullName || client.companyName || 'Client'},`,
      `Current stage: ${stage}`,
      `Quotation ID: ${quotation?.quotationId || '-'}`,
      `Invoice ID: ${invoice?.invoiceId || '-'}`,
      `Remaining balance: Rs ${remaining || 0}`,
      `Admin remarks: ${adminRemarks || quotation?.adminRemarks || '-'}`,
      paymentLine,
      '',
      `Login/View: ${reviewUrl}`
    ].join('\n');
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;background:#f6f7fb;padding:24px;color:#111827">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;padding:24px;border:1px solid #e5e7eb">
          <div style="font-size:18px;font-weight:800;color:#4f32c8">Bit Byte Technologies</div>
          <h2 style="margin:18px 0 8px;font-size:24px;color:#111827">${stage}</h2>
          <p>Hello ${client.fullName || client.companyName || 'Client'},</p>
          <table style="width:100%;margin:18px 0;border-collapse:collapse">
            <tr><td style="padding:8px;color:#64748b">Quotation ID</td><td style="padding:8px;font-weight:700">${quotation?.quotationId || '-'}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Invoice ID</td><td style="padding:8px;font-weight:700">${invoice?.invoiceId || '-'}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Current stage</td><td style="padding:8px;font-weight:700">${stage}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Remaining balance</td><td style="padding:8px;font-weight:700">Rs ${remaining || 0}</td></tr>
            ${payment ? `<tr><td style="padding:8px;color:#64748b">Payment details</td><td style="padding:8px;font-weight:700">${payment.paymentLabel || 'Payment'} - Rs ${payment.amount || 0} - ${payment.status || payment.paymentStatus || '-'}</td></tr>` : ''}
            <tr><td style="padding:8px;color:#64748b">Admin remarks</td><td style="padding:8px;font-weight:700">${adminRemarks || quotation?.adminRemarks || '-'}</td></tr>
          </table>
          <a href="${reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#7444DC,#8D6BE2);color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:800">Login / View</a>
        </div>
      </div>
    `;
    await sendNotificationEmail({
      to: client.email,
      subject: `Bit Byte Technologies - ${stage}`,
      text,
      html
    });
  } catch (_) {
    // Workflow emails should not block admin operations.
  }
}
