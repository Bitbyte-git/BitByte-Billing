import PdfPrinter from 'pdfmake';
import { getSacCode } from './sacCodes.js';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function enrichInvoiceItem(item) {
  const serviceName = item.service || item.subService || '';
  const quantity = Number(item.quantity || 1);
  const taxableValue = Number(item.taxableValue ?? item.amount ?? 0);
  const gstPercentage = Number(item.gstPercentage ?? 18);
  const gstTotal = Number(item.gstAmount ?? taxableValue * gstPercentage / 100);
  const cgstAmount = Number(item.cgstAmount ?? gstTotal / 2);
  const sgstAmount = Number(item.sgstAmount ?? gstTotal / 2);
  const igstAmount = Number(item.igstAmount ?? 0);
  const total = Number(item.total ?? taxableValue + gstTotal);
  return {
    ...item,
    service: serviceName,
    sacCode: item.sacCode || getSacCode(serviceName),
    quantity,
    taxableValue,
    gstPercentage,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total
  };
}

export function buildInvoiceLineFromQuotationItem(item) {
  const serviceName = item.subService || item.subServiceName || item.serviceId?.name || 'Service';
  const quantity = Number(item.quantity || 1);
  const taxableValue = Math.max((item.basePrice * quantity) - (item.discountAmount || 0), 0);
  const gstPercentage = Number(item.gstPercentage || 18);
  const gstTotal = Number(item.gstAmount ?? taxableValue * gstPercentage / 100);
  return {
    serviceId: item.serviceId,
    service: serviceName,
    description: item.description || '',
    sacCode: getSacCode(serviceName),
    quantity,
    taxableValue,
    amount: taxableValue,
    gstPercentage,
    gstAmount: gstTotal,
    cgstAmount: gstTotal / 2,
    sgstAmount: gstTotal / 2,
    igstAmount: 0,
    total: Number(item.totalAmount ?? taxableValue + gstTotal)
  };
}

export function createInvoicePdfDocument(invoice) {
  const fonts = {
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };
  const printer = new PdfPrinter(fonts);
  const items = (invoice.items || []).map(enrichInvoiceItem);
  const itemRows = items.map((item, index) => ([
    { text: String(index + 1), alignment: 'center' },
    { text: [item.service, item.description ? `\n${item.description}` : ''].filter(Boolean).join(''), fontSize: 8 },
    { text: item.sacCode, alignment: 'center', fontSize: 8 },
    { text: String(item.quantity), alignment: 'center' },
    { text: formatMoney(item.taxableValue), alignment: 'right' },
    { text: formatMoney(item.cgstAmount), alignment: 'right' },
    { text: formatMoney(item.sgstAmount), alignment: 'right' },
    { text: formatMoney(item.igstAmount), alignment: 'right' },
    { text: formatMoney(item.total), alignment: 'right', bold: true }
  ]));

  const totals = items.reduce((acc, item) => ({
    taxable: acc.taxable + item.taxableValue,
    cgst: acc.cgst + item.cgstAmount,
    sgst: acc.sgst + item.sgstAmount,
    igst: acc.igst + item.igstAmount,
    total: acc.total + item.total
  }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [28, 28, 28, 28],
    content: [
      { text: 'TAX INVOICE', style: 'header', alignment: 'center' },
      { text: 'Bit Byte Technologies', style: 'subheader', alignment: 'center' },
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
            ],
            fontSize: 9
          },
          {
            width: '*',
            alignment: 'right',
            text: [
              { text: `Invoice No: ${invoice.invoiceId}\n`, bold: true },
              `Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}\n`,
              `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}\n`,
              `Payment Status: ${invoice.paymentStatus || 'Pending'}\n`,
              { text: `Balance Due: Rs ${formatMoney(invoice.balanceDue)}\n`, color: '#b91c1c', bold: true }
            ],
            fontSize: 9
          }
        ]
      },
      { text: '\nBilled To:', bold: true, fontSize: 10 },
      {
        text: `${invoice.clientId?.companyName || invoice.clientId?.fullName || 'Client'}\n${invoice.clientId?.email || ''}\nPhone: ${invoice.clientId?.phone || '-'}`,
        fontSize: 9,
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: [22, '*', 42, 22, 52, 42, 42, 42, 52],
          body: [
            [
              { text: 'S.No', bold: true, fontSize: 7, alignment: 'center' },
              { text: 'Description of Service', bold: true, fontSize: 7 },
              { text: 'SAC', bold: true, fontSize: 7, alignment: 'center' },
              { text: 'Qty', bold: true, fontSize: 7, alignment: 'center' },
              { text: 'Taxable Value (Rs)', bold: true, fontSize: 7, alignment: 'right' },
              { text: 'CGST (9%)', bold: true, fontSize: 7, alignment: 'right' },
              { text: 'SGST (9%)', bold: true, fontSize: 7, alignment: 'right' },
              { text: 'IGST (18%)', bold: true, fontSize: 7, alignment: 'right' },
              { text: 'Total (Rs)', bold: true, fontSize: 7, alignment: 'right' }
            ],
            ...itemRows
          ]
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? '#f1f5f9' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0'
        }
      },
      { text: '\n' },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            table: {
              widths: [120, 100],
              body: [
                ['Taxable Subtotal', formatMoney(totals.taxable)],
                ['CGST Total', formatMoney(totals.cgst)],
                ['SGST Total', formatMoney(totals.sgst)],
                ['IGST Total', formatMoney(totals.igst)],
                ['Discount', formatMoney(invoice.discountedAmount || 0)],
                ['Invoice Total', formatMoney(invoice.totalAmount)],
                [{ text: 'Amount Paid', bold: true }, formatMoney(invoice.amountPaid || 0)],
                [{ text: 'Balance Pending', bold: true, color: '#b91c1c' }, { text: formatMoney(invoice.balanceDue), bold: true, color: '#b91c1c' }]
              ]
            },
            layout: 'noBorders',
            fontSize: 9
          }
        ]
      },
      { text: '\nThank you for your business.', alignment: 'center', italics: true, fontSize: 9 }
    ],
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 11, color: '#4f32c8' }
    },
    defaultStyle: { font: 'Roboto', fontSize: 8 }
  };

  return printer.createPdfKitDocument(docDefinition);
}

export function invoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = createInvoicePdfDocument(invoice);
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
