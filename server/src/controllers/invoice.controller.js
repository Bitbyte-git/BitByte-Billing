import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import QuotationItem from '../models/QuotationItem.js';
import { changeQuotationStatus, recordAudit } from '../services/workflowService.js';
import { nextInvoiceId } from '../utils/idGenerator.js';

export async function listInvoices(req, res, next) {
  try {
    const client = req.user.role === 'Client' ? await Client.findOne({ email: req.user.email }) : null;
    const query = req.user.role === 'Client' ? (client ? { clientId: client._id } : { _id: null }) : {};
    if (req.query.quotationId) query.quotationId = req.query.quotationId;
    res.json(await Invoice.find(query).populate('clientId quotationId').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
}

export async function getInvoice(req, res, next) {
  try { res.json(await Invoice.findById(req.params.id).populate('clientId quotationId')); } catch (err) { next(err); }
}

export async function generateInvoice(req, res, next) {
  try {
    const quotation = await Quotation.findById(req.params.quotationId).populate('servicesSelected');
    if (!quotation || quotation.status !== 'Approved') throw Object.assign(new Error('Only approved quotations can generate invoices'), { status: 422 });
    const items = await QuotationItem.find({ quotationId: quotation._id }).populate('serviceId');
    const invoice = await Invoice.create({
      invoiceId: await nextInvoiceId(),
      quotationId: quotation._id,
      clientId: quotation.clientId,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      items: items.map((item) => ({ serviceId: item.serviceId, service: item.serviceId?.name, description: item.description, amount: item.estimatedCost, gstPercentage: item.gstPercentage, total: item.total })),
      subtotal: quotation.subtotal,
      gstAmount: quotation.gstAmount,
      totalAmount: quotation.totalAmount,
      balanceDue: quotation.totalAmount
    });
    await changeQuotationStatus({ quotation, status: 'Invoice Generated', user: req.user });
    res.status(201).json(invoice);
  } catch (err) { next(err); }
}

import PdfPrinter from 'pdfmake';

export async function invoicePdf(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('clientId quotationId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    const printer = new PdfPrinter(fonts);

    const docDefinition = {
      content: [
        { text: 'INVOICE', style: 'header', alignment: 'center' },
        { text: '\n' },
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Bit Byte Technologies\n', bold: true },
                '123 Tech Park, Suite 400\n',
                'Bangalore, KA 560001\n',
                'GSTIN: 29ABCDE1234F1Z5\n'
              ]
            },
            {
              width: '*',
              alignment: 'right',
              text: [
                { text: `Invoice No: ${invoice.invoiceId}\n`, bold: true },
                `Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}\n`,
                `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n`
              ]
            }
          ]
        },
        { text: '\n\nBilled To:', bold: true },
        { text: `${invoice.clientId.companyName || invoice.clientId.fullName}\n${invoice.clientId.email}\nPhone: ${invoice.clientId.phone}\n` },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Description', bold: true },
                { text: 'Amount', bold: true },
                { text: 'GST %', bold: true },
                { text: 'Total', bold: true }
              ],
              ...(invoice.items || []).map(item => [
                `${item.service}\n${item.description}`,
                `Rs ${item.amount}`,
                `${item.gstPercentage}%`,
                `Rs ${item.total}`
              ])
            ]
          }
        },
        { text: '\n' },
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                widths: [100, 100],
                body: [
                  ['Subtotal', `Rs ${invoice.subtotal}`],
                  ['GST Amount', `Rs ${invoice.gstAmount}`],
                  [{ text: 'Total Amount', bold: true }, { text: `Rs ${invoice.totalAmount}`, bold: true }]
                ]
              },
              layout: 'noBorders'
            }
          ]
        },
        { text: '\n\nThank you for your business!', alignment: 'center', italics: true }
      ],
      styles: {
        header: { fontSize: 22, bold: true }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceId}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    next(err);
  }
}

export async function sendInvoiceEmail(req, res, next) {
  try {
    await recordAudit({ userId: req.user._id, action: 'Invoice email sent', entityType: 'Invoice', entityId: req.params.id, newValue: { sent: true } });
    res.json({ message: 'Invoice email queued' });
  } catch (err) { next(err); }
}
