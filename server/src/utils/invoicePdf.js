import { existsSync, readFileSync } from "fs";
import path from "path";
import PdfPrinter from "pdfmake";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { getSacCode } from "./sacCodes.js";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function formatDateTime(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoCandidates = [
  path.resolve(__dirname, "../../../client/src/assets/logo-invoice.png"),
  path.resolve(__dirname, "../../../client/src/assets/logo.png"),
];
const logoPath = logoCandidates.find((candidate) => existsSync(candidate));
const companyLogo = logoPath
  ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
  : null;

const COMPANY = {
  name: "Bit Byte Technologies",
  office: "Corporate Office",
  address: ["2nd Floor, Raja Complex", "Salem, Tamil Nadu - 636302", "India"],
  gstin: process.env.COMPANY_GSTIN || "33BLNPN539J1ZL",
  udyamId: process.env.COMPANY_UDYAM_ID || "UDYAM-TN-20-0234773",
};

const COLORS = {
  blue: "#0F7CEB",
  green: "#6BCB2D",
  navy: "#0F172A",
  text: "#111827",
  muted: "#4B5563",
  border: "#D9DEE7",
  bg: "#F8FAFC",
  panel: "#F8FAFC",
  headerNavy: "#12385F",
  headerStripe: "#3A78BE",
};

const PAGE_WIDTH = 595.28;
const HEADER_BANNER = { width: 172, height: 100 };

function invoiceCornerBannerSvg(width = HEADER_BANNER.width, height = HEADER_BANNER.height) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 172 100">
  <polygon points="86,0 172,0 172,100 24,100" fill="${COLORS.headerNavy}"/>
  <polygon points="73,0 86,0 24,100 13,100" fill="${COLORS.headerStripe}"/>
  <g fill="#FFFFFF" font-family="Helvetica" font-size="6.5" font-weight="bold" text-anchor="end">
    <text x="162" y="17" letter-spacing="2.4">TECHNOLOGY</text>
    <text x="162" y="29" letter-spacing="2.4">PEOPLE</text>
    <text x="162" y="41" letter-spacing="2.4">IDEAS</text>
    <text x="162" y="53" letter-spacing="2.4">SOLUTIONS</text>
    <text x="162" y="65" letter-spacing="2.4">GROWTH</text>
  </g>
  <line x1="116" y1="73" x2="162" y2="73" stroke="#FFFFFF" stroke-width="1.4"/>
  <g fill="#FFFFFF" font-family="Helvetica" font-size="5.8" font-weight="bold" text-anchor="end">
    <text x="162" y="86" letter-spacing="1.15">BUILD A SMARTER</text>
    <text x="162" y="96" letter-spacing="1.15">TOMORROW</text>
  </g>
</svg>`.trim();
}

function invoiceHeaderBackground() {
  return (currentPage) => {
    if (currentPage !== 1) return undefined;
    return {
      absolutePosition: { x: PAGE_WIDTH - HEADER_BANNER.width, y: 0 },
      svg: invoiceCornerBannerSvg(),
    };
  };
}

function invoiceHeaderBlock(rightGutter = 118) {
  return {
    table: {
      widths: [112, "*", rightGutter],
      body: [
        [
          {
            stack: [
              companyLogo
                ? { image: companyLogo, fit: [108, 86], alignment: "center" }
                : {
                    text: "BB",
                    alignment: "center",
                    bold: true,
                    color: COLORS.blue,
                    fontSize: 18,
                  },
            ],
            alignment: "center",
            margin: [0, -8, 0, -6],
          },
          {
            stack: [
              {
                text: [
                  { text: "Bit Byte", color: COLORS.blue },
                  { text: " Technologies", color: COLORS.green },
                ],
                bold: true,
                fontSize: 20,
                margin: [0, 0, 0, 4],
              },
              {
                text: `${COMPANY.office}, ${COMPANY.address[0]}`,
                fontSize: 8.7,
                bold: true,
                color: COLORS.navy,
              },
              {
                text: `${COMPANY.address[1]}, ${COMPANY.address[2]}`,
                fontSize: 8.7,
                bold: true,
                color: COLORS.navy,
                margin: [0, 1, 0, 4],
              },
              {
                text: [
                  { text: `GST NO : ${COMPANY.gstin}` },
                  { text: "   |   ", color: "#94A3B8" },
                  { text: `MSME : ${COMPANY.udyamId}` },
                ],
                fontSize: 8,
                bold: true,
                color: COLORS.navy,
                noWrap: true,
              },
            ],
            margin: [4, 4, 0, 0],
          },
          { text: "" },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 0, 0, 10],
  };
}

const INTERN_INVOICE_TAX = {
  sacCode: "999293",
  cgstRate: 9,
  sgstRate: 9,
};

const INTERN_INVOICE_TERMS = [
  "The amount is non-refundable.",
  "The amount is non-transferable.",
  "Fees cover only the internship services specified in this invoice.",
];

function internInvoiceTaxBreakdown(baseAmount) {
  const taxableValue = Number(baseAmount || 0);
  const cgstAmount = (taxableValue * INTERN_INVOICE_TAX.cgstRate) / 100;
  const sgstAmount = (taxableValue * INTERN_INVOICE_TAX.sgstRate) / 100;
  const total = taxableValue + cgstAmount + sgstAmount;
  return {
    ...INTERN_INVOICE_TAX,
    taxableValue,
    cgstAmount,
    sgstAmount,
    total,
  };
}

function normalizeAbsoluteUrl(value) {
  const trimmed = String(value || "")
    .trim()
    .replace(/\/+$/, "");
  if (!trimmed) return "https://bit-byte-billing-client.vercel.app";
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function publicInternInvoiceUrl(invoice) {
  const baseUrl = normalizeAbsoluteUrl(
    process.env.CLIENT_URL || process.env.APP_URL,
  );
  const publicId =
    invoice._id || invoice.id || invoice.invoiceId || invoice.internId;
  return `${baseUrl}/public/intern-invoice/${encodeURIComponent(String(publicId || ""))}`;
}

function publicClientInvoiceUrl(invoice) {
  const baseUrl = normalizeAbsoluteUrl(
    process.env.CLIENT_URL || process.env.APP_URL,
  );
  const publicId = invoice._id || invoice.id || invoice.invoiceId;
  return `${baseUrl}/public/client-invoice/${encodeURIComponent(String(publicId || ""))}`;
}

function qrSvg(value) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M", margin: 1 });
  const size = qr.modules.size;
  const cells = qr.modules.data;
  const rects = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (cells[y * size + x])
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/><g fill="#07111f">${rects.join("")}</g></svg>`;
}

export function enrichInvoiceItem(item) {
  const serviceName = item.service || item.subService || "";
  const quantity = Number(item.quantity || 1);
  const taxableValue = Number(item.taxableValue ?? item.amount ?? 0);
  const gstPercentage = Number(item.gstPercentage ?? 18);
  const gstTotal = Number(
    item.gstAmount ?? (taxableValue * gstPercentage) / 100,
  );
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
    total,
  };
}

export function buildInvoiceLineFromQuotationItem(item) {
  const serviceName =
    item.subService || item.subServiceName || item.serviceId?.name || "Service";
  const quantity = Number(item.quantity || 1);
  const taxableValue = Math.max(
    item.basePrice * quantity - (item.discountAmount || 0),
    0,
  );
  const gstPercentage = Number(item.gstPercentage || 18);
  const gstTotal = Number(
    item.gstAmount ?? (taxableValue * gstPercentage) / 100,
  );
  return {
    serviceId: item.serviceId,
    service: serviceName,
    description: item.description || "",
    sacCode: getSacCode(serviceName) || item.sacCode || "998314",
    unit: item.unit || "Per Service",
    frequency: item.frequency || "One Time",
    payable: item.payable || "One Time",
    quantity,
    taxableValue,
    amount: taxableValue,
    gstPercentage,
    gstAmount: gstTotal,
    cgstAmount: gstTotal / 2,
    sgstAmount: gstTotal / 2,
    igstAmount: 0,
    total: Number(item.totalAmount ?? taxableValue + gstTotal),
  };
}

function formatSalutationName(client) {
  if (!client) return "Client";
  const rawName = client.fullName || client.name || client.clientName || client.companyName || "Client";
  if (!client.salutation) return rawName;
  const sal = client.salutation.trim();
  const prefix = (sal.endsWith('.') || sal === 'M/s') ? sal : `${sal}.`;
  return `${prefix} ${rawName}`;
}

export function createInvoicePdfDocument(invoice) {
  const fonts = {
    Roboto: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };
  const printer = new PdfPrinter(fonts);
  const items = (invoice.items || []).map(enrichInvoiceItem);
  const clientName = formatSalutationName(invoice.clientId);
  const clientEmail = invoice.clientId?.email || "-";
  const clientPhone = invoice.clientId?.phone || "-";
  const quotationLabel =
    invoice.quotationId?.quotationId ||
    invoice.quotationId?.projectTitle ||
    "-";
  const publicUrl = publicClientInvoiceUrl(invoice);
  const totals = items.reduce(
    (acc, item) => ({
      taxable: acc.taxable + item.taxableValue,
      cgst: acc.cgst + item.cgstAmount,
      sgst: acc.sgst + item.sgstAmount,
      igst: acc.igst + item.igstAmount,
      total: acc.total + item.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );
  const invoiceTotal = Number(
    invoice.totalAmount ?? invoice.finalTotal ?? totals.total ?? 0,
  );
  const amountPaid = Number(invoice.amountPaid || 0);
  const balanceDue = Number(
    invoice.balanceDue ?? Math.max(invoiceTotal - amountPaid, 0),
  );

  // ── Split payment totals: One Time vs. Monthly Recurring ──
  const oneTimeItems = items.filter(
    (item) => !(String(item.frequency).includes('Monthly') || String(item.payable).includes('Monthly') || String(item.frequency).includes('Weekly'))
  );
  const recurringItems = items.filter(
    (item) => (String(item.frequency).includes('Monthly') || String(item.payable).includes('Monthly') || String(item.frequency).includes('Weekly'))
  );

  const oneTimeTotals = oneTimeItems.reduce(
    (acc, item) => ({
      taxable: acc.taxable + item.taxableValue,
      cgst: acc.cgst + item.cgstAmount,
      sgst: acc.sgst + item.sgstAmount,
      igst: acc.igst + item.igstAmount,
      total: acc.total + item.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  const recurringTotals = recurringItems.reduce(
    (acc, item) => ({
      taxable: acc.taxable + item.taxableValue,
      cgst: acc.cgst + item.cgstAmount,
      sgst: acc.sgst + item.sgstAmount,
      igst: acc.igst + item.igstAmount,
      total: acc.total + item.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  const detailCell = (label, value, options = {}) => ({
    stack: [
      { text: label, style: "label" },
      {
        text: value || "-",
        style: "value",
        color: options.color || COLORS.text,
      },
    ],
    margin: options.margin || [0, 0, 0, 0],
  });
  const sectionHeaderCell = (label) => ({
    text: label,
    style: "sectionTitle",
    alignment: "center",
    colSpan: 2,
    fillColor: "#FFFFFF",
  });
  const detailTableLayout = {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => 7,
    paddingRight: () => 7,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
  const cardLayout = {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
  const sectionTable = (title, rows) => ({
    table: {
      widths: ["*", "*"],
      body: [[{ ...sectionHeaderCell(title), colSpan: 2 }, {}], ...rows],
    },
    layout: detailTableLayout,
  });
  const moneyRow = (label, value, options = {}) => [
    {
      text: label,
      bold: options.bold || false,
      color: options.color || COLORS.navy,
      margin: [0, 3, 0, 3],
    },
    {
      text: `Rs ${formatMoney(value)}`,
      alignment: "right",
      bold: options.bold || false,
      color: options.color || COLORS.navy,
      margin: [0, 3, 0, 3],
    },
  ];
  function getFrequencyLabel(frequency, payable) {
    const freq = String(frequency || '').trim();
    const pay = String(payable || '').trim();
    if (freq === 'Monthly' || pay === 'Monthly') return 'Monthly';
    if (freq === 'Weekly') return 'Weekly';
    if (freq === 'Quarterly' || pay === 'Quarterly') return 'Quarterly';
    if (freq === 'Yearly' || pay === 'Yearly') return 'Yearly';
    if (freq) return freq;
    return 'One Time';
  }

  const itemRows = items.length
    ? items.map((item, index) => {
        const freqLabel = getFrequencyLabel(item.frequency, item.payable);
        const isRecurring = freqLabel !== 'One Time';
        return [
          { text: String(index + 1), alignment: "center", margin: [0, 8, 0, 8] },
          {
            text: [
              { text: item.service || "Service", bold: true },
              { text: `\n[Mandatory]`, color: "#0F7CEB", bold: true, fontSize: 7.5 },
              item.description
                ? {
                    text: `\n${item.description}`,
                    color: COLORS.muted,
                    fontSize: 7.2,
                  }
                : { text: "" },
            ],
            margin: [0, 8, 0, 8],
          },
          { text: item.sacCode || "-", alignment: "center", margin: [0, 8, 0, 8] },
          {
            text: freqLabel,
            alignment: "center",
            bold: true,
            color: isRecurring ? "#7C3AED" : COLORS.navy,
            fontSize: 7.5,
            margin: [0, 8, 0, 8],
          },
          { text: String(item.quantity || 1), alignment: "center", margin: [0, 8, 0, 8] },
          { text: formatMoney(item.taxableValue), alignment: "right", margin: [0, 8, 0, 8] },
          { text: formatMoney(item.cgstAmount), alignment: "right", margin: [0, 8, 0, 8] },
          { text: formatMoney(item.sgstAmount), alignment: "right", margin: [0, 8, 0, 8] },
          { text: formatMoney(item.igstAmount), alignment: "right", margin: [0, 8, 0, 8] },
          { text: formatMoney(item.total), alignment: "right", bold: true, margin: [0, 8, 0, 8] },
        ];
      })
    : [
        [
          {
            text: "No invoice line items available.",
            colSpan: 10,
            alignment: "center",
            color: COLORS.muted,
            margin: [0, 14, 0, 14],
          },
          {}, {}, {}, {}, {}, {}, {}, {}, {},
        ],
      ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [24, 18, 24, 42],
    background: invoiceHeaderBackground(),
    content: [
      invoiceHeaderBlock(HEADER_BANNER.width - 24),
      {
        columns: [
          {
            width: "*",
            ...sectionTable("CLIENT DETAILS", [
              [
                detailCell("CLIENT NAME", clientName),
                detailCell("E-MAIL", clientEmail),
              ],
              [
                detailCell("PHONE", clientPhone),
                detailCell("QUOTATION", quotationLabel),
              ],
              [
                detailCell(
                  "COMPANY",
                  invoice.clientId?.companyName || "-",
                ),
                detailCell("CLIENT ID", invoice.clientId?._id || "-"),
              ],
            ]),
          },
          {
            width: "*",
            ...sectionTable("INVOICE & PAYMENT DETAILS", [
              [
                detailCell("INVOICE DT", formatDate(invoice.invoiceDate)),
                detailCell("INVOICE ID", invoice.invoiceId),
              ],
              [
                detailCell("DUE DATE", formatDate(invoice.dueDate)),
                detailCell(
                  "PAYMENT STATUS",
                  invoice.paymentStatus || "Pending",
                ),
              ],
              [
                detailCell("GENERATED BY", "BBTech Admin Team"),
                detailCell("BILLING TYPE", "Client Billing"),
              ],
            ]),
          },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 10],
      },
      {
        margin: [0, 0, 0, 10],
        table: {
          headerRows: 2,
          widths: [20, "*", 36, 52, 22, 48, 42, 42, 42, 54],
          body: [
            [
              {
                text: "PAYMENT DETAILS",
                style: "sectionTitle",
                alignment: "center",
                colSpan: 10,
                fillColor: "#FFFFFF",
              },
              {}, {}, {}, {}, {}, {}, {}, {}, {},
            ],
            [
              { text: "S.No", style: "tableHeader", alignment: "center" },
              { text: "Description", style: "tableHeader" },
              { text: "SAC", style: "tableHeader", alignment: "center" },
              { text: "Frequency", style: "tableHeader", alignment: "center" },
              { text: "Qty", style: "tableHeader", alignment: "center" },
              { text: "Taxable", style: "tableHeader", alignment: "right" },
              { text: "CGST", style: "tableHeader", alignment: "right" },
              { text: "SGST", style: "tableHeader", alignment: "right" },
              { text: "IGST", style: "tableHeader", alignment: "right" },
              { text: "Total", style: "tableHeader", alignment: "right" },
            ],
            ...itemRows,
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 1 ? COLORS.navy : "#FFFFFF"),
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
      // ── Terms & Invoice Summary Page (Fresh Page) ──
      {
        pageBreak: "before",
        stack: [
          // ── Header: 2 Columns for Payment Summaries ──
          {
            columns: [
              {
                width: "*",
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        stack: [
                          { text: "ONE TIME SERVICES PAYMENT SUMMARY", style: "sectionTitle" },
                          {
                            table: {
                              widths: ["*", 90],
                              body: [
                                moneyRow("Taxable Amount", oneTimeTotals.taxable),
                                moneyRow("CGST Total", oneTimeTotals.cgst),
                                moneyRow("SGST Total", oneTimeTotals.sgst),
                                moneyRow("IGST Total", oneTimeTotals.igst),
                                moneyRow("One Time Subtotal", oneTimeTotals.total, { bold: true, color: COLORS.blue }),
                              ],
                            },
                            layout: "noBorders",
                            margin: [0, 6, 0, 0],
                          },
                        ],
                        margin: [8, 8, 8, 8],
                      },
                    ],
                  ],
                },
                layout: cardLayout,
              },
              {
                width: "*",
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        stack: [
                          { text: "MONTHLY RECURRING PAYMENT SUMMARY", style: "sectionTitle" },
                          {
                            table: {
                              widths: ["*", 90],
                              body: [
                                moneyRow("Taxable Amount", recurringTotals.taxable),
                                moneyRow("CGST Total", recurringTotals.cgst),
                                moneyRow("SGST Total", recurringTotals.sgst),
                                moneyRow("IGST Total", recurringTotals.igst),
                                moneyRow("Monthly Subtotal", recurringTotals.total, { bold: true, color: "#7C3AED" }),
                              ],
                            },
                            layout: "noBorders",
                            margin: [0, 6, 0, 0],
                          },
                        ],
                        margin: [8, 8, 8, 8],
                      },
                    ],
                  ],
                },
                layout: cardLayout,
              },
            ],
            columnGap: 12,
            margin: [0, 70, 0, 10],
          },

          // ── Overall Invoice Total Summary ──
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    stack: [
                      { text: "TOTAL INVOICE SUMMARY", style: "sectionTitle" },
                      {
                        table: {
                          widths: ["*", "*", "*", "*", "*", "*", "*"],
                          body: [
                            [
                              { text: "Taxable Amount", style: "label", alignment: "center" },
                              { text: "CGST Total", style: "label", alignment: "center" },
                              { text: "SGST Total", style: "label", alignment: "center" },
                              { text: "IGST Total", style: "label", alignment: "center" },
                              { text: "Invoice Total", style: "label", alignment: "center" },
                              { text: "Amount Paid", style: "label", alignment: "center" },
                              { text: "Balance Due", style: "label", alignment: "center" },
                            ],
                            [
                              { text: `Rs ${formatMoney(totals.taxable)}`, alignment: "center", bold: true, fontSize: 8.5 },
                              { text: `Rs ${formatMoney(totals.cgst)}`, alignment: "center", bold: true, fontSize: 8.5 },
                              { text: `Rs ${formatMoney(totals.sgst)}`, alignment: "center", bold: true, fontSize: 8.5 },
                              { text: `Rs ${formatMoney(totals.igst)}`, alignment: "center", bold: true, fontSize: 8.5 },
                              { text: `Rs ${formatMoney(invoiceTotal)}`, alignment: "center", bold: true, fontSize: 9, color: COLORS.blue },
                              { text: `Rs ${formatMoney(amountPaid)}`, alignment: "center", bold: true, fontSize: 8.5, color: COLORS.green },
                              { text: `Rs ${formatMoney(balanceDue)}`, alignment: "center", bold: true, fontSize: 9, color: balanceDue > 0 ? "#B91C1C" : COLORS.green },
                            ],
                          ],
                        },
                        layout: detailTableLayout,
                        margin: [0, 6, 0, 0],
                      },
                    ],
                    margin: [10, 8, 10, 8],
                  },
                ],
              ],
            },
            layout: cardLayout,
            margin: [0, 10, 0, 10],
          },

          // ── Terms & Conditions and Authorized Signatory Side-by-Side ──
          {
            columns: [
              {
                width: "*",
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        stack: [
                          { text: "TERMS & CONDITIONS", style: "sectionTitle" },
                          {
                            text: "1. Payment is due on or before the invoice due date.",
                            margin: [0, 6, 0, 0],
                            lineHeight: 1.2,
                          },
                          {
                            text: "2. Prices are subject to change after the validity period.",
                            margin: [0, 4, 0, 0],
                            lineHeight: 1.2,
                          },
                          {
                            text: "3. GST @18% is applicable on all services as per government norms.",
                            margin: [0, 4, 0, 0],
                            lineHeight: 1.2,
                          },
                          {
                            text: "4. Please mention the invoice number for all communications.",
                            margin: [0, 4, 0, 0],
                            lineHeight: 1.2,
                          },
                          {
                            text: "5. This is a computer-generated invoice.",
                            margin: [0, 6, 0, 0],
                            color: COLORS.muted,
                            bold: true,
                          },
                        ],
                        margin: [8, 8, 8, 8],
                      },
                    ],
                  ],
                },
                layout: cardLayout,
                fontSize: 8,
              },
              {
                width: "*",
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: "AUTHORIZED SIGNATORY",
                            style: "sectionTitle",
                            margin: [0, 0, 0, 36],
                          },
                          {
                            canvas: [
                              {
                                type: "line",
                                x1: 0,
                                y1: 0,
                                x2: 170,
                                y2: 0,
                                lineWidth: 0.8,
                                lineColor: COLORS.navy,
                              },
                            ],
                            alignment: "right",
                          },
                          {
                            text: "Authorized Signatory",
                            alignment: "right",
                            fontSize: 9,
                            bold: true,
                            color: COLORS.navy,
                            margin: [0, 5, 0, 0],
                          },
                          {
                            text: COMPANY.name,
                            alignment: "right",
                            fontSize: 8,
                            color: COLORS.blue,
                          },
                        ],
                        margin: [12, 12, 12, 12],
                      },
                    ],
                  ],
                },
                layout: cardLayout,
              },
            ],
            columnGap: 12,
            margin: [0, 0, 0, 10],
          },

          // ── Thank You + QR Verification Footer ──
          {
            table: {
              dontBreakRows: true,
              widths: ["*", 174],
              body: [
                [
                  {
                    stack: [
                      {
                        text: "Thank you",
                        fontSize: 14,
                        bold: true,
                        color: COLORS.navy,
                      },
                      {
                        text: "for choosing Bit Byte Technologies.",
                        fontSize: 8.5,
                        color: COLORS.muted,
                        margin: [0, 5, 0, 0],
                      },
                    ],
                    margin: [14, 12, 14, 12],
                  },
                  {
                    stack: [
                      {
                        text: "QR VERIFICATION",
                        style: "sectionTitle",
                        alignment: "center",
                        margin: [0, 0, 0, 4],
                      },
                      {
                        text: "Scan to verify invoice price details",
                        alignment: "center",
                        fontSize: 7.5,
                        bold: true,
                        color: COLORS.navy,
                        margin: [0, 0, 0, 6],
                      },
                      { svg: qrSvg(publicUrl), width: 68, alignment: "center" },
                    ],
                    margin: [12, 10, 12, 10],
                  },
                ],
              ],
            },
            layout: cardLayout,
          },
        ],
      },
    ],
    footer: (currentPage, pageCount) => ({
      margin: [24, 0, 24, 10],
      stack: [
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 511,
              y2: 0,
              lineWidth: 0.6,
              lineColor: COLORS.border,
            },
          ],
        },
        {
          columns: [
            {
              text: "Client invoice generated by Bit Byte Technologies billing system.",
              fontSize: 7.5,
              color: COLORS.muted,
              margin: [0, 7, 0, 0],
            },
            {
              stack: [
                {
                  text: "Email Id : reachus@bitbytetech.org",
                  fontSize: 7.5,
                  color: COLORS.navy,
                },
                {
                  text: "Contact No : 9943743136",
                  fontSize: 7.5,
                  color: COLORS.navy,
                  margin: [0, 2, 0, 0],
                },
              ],
              alignment: "center",
              margin: [0, 6, 0, 0],
            },
            {
              text: `Generated on ${formatDateTime(invoice.createdAt || new Date())}`,
              alignment: "right",
              fontSize: 7.5,
              color: COLORS.muted,
              margin: [0, 7, 0, 0],
            },
          ],
        },
        {
          text: `${currentPage}/${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: COLORS.muted,
          margin: [0, 4, 0, 0],
        },
      ],
    }),
    styles: {
      label: {
        fontSize: 7.3,
        color: COLORS.muted,
        bold: true,
        characterSpacing: 0.4,
      },
      value: {
        fontSize: 9.2,
        color: COLORS.text,
        bold: true,
        margin: [0, 3, 0, 0],
      },
      tableHeader: { bold: true, fontSize: 7, color: "#FFFFFF" },
      boxTitle: { fontSize: 9, bold: true, color: COLORS.navy },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: COLORS.navy,
        margin: [0, 0, 0, 10],
      },
    },
    defaultStyle: { font: "Roboto", fontSize: 8, color: COLORS.navy },
  };

  return printer.createPdfKitDocument(docDefinition);
}

export function invoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = createInvoicePdfDocument(invoice);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export function createInternInvoicePdfDocument(invoice) {
  const fonts = {
    Roboto: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };
  const printer = new PdfPrinter(fonts);
  const amount = Number(invoice.amount || 0);
  const taxBreakdown = internInvoiceTaxBreakdown(amount);
  const paymentStatus = invoice.paymentReceived ? "Paid" : "Pending";
  const generatedBy =
    invoice.createdBy?.name || invoice.createdBy?.email || "BBTech Admin Team";
  const publicUrl = publicInternInvoiceUrl(invoice);
  const detailCell = (label, value, options = {}) => ({
    stack: [
      { text: label, style: "label" },
      {
        text: value || "-",
        style: "value",
        color: options.color || COLORS.text,
      },
    ],
    fillColor: options.fillColor,
    margin: options.margin || [0, 0, 0, 0],
  });
  const sectionHeaderCell = (label) => ({
    text: label,
    style: "sectionTitle",
    alignment: "center",
    colSpan: 2,
    fillColor: "#FFFFFF",
    margin: [0, 0, 0, 0],
  });
  const detailTableLayout = {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => 7,
    paddingRight: () => 7,
    paddingTop: () => 5,
    paddingBottom: () => 5,
  };
  const summaryRow = (label, value, options = {}) => [
    {
      text: label,
      bold: options.bold || false,
      color: options.color || COLORS.navy,
      margin: [0, 3, 0, 3],
    },
    {
      text: `Rs ${formatMoney(value)}`,
      alignment: "right",
      bold: options.bold || false,
      color: options.color || COLORS.navy,
      margin: [0, 3, 0, 3],
    },
  ];
  const cardLayout = {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };
  const sectionTable = (title, rows) => ({
    table: {
      widths: ["*", "*"],
      body: [[{ ...sectionHeaderCell(title), colSpan: 2 }, {}], ...rows],
    },
    layout: detailTableLayout,
  });

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [18, 14, 18, 17],
    background: invoiceHeaderBackground(),
    content: [
      invoiceHeaderBlock(HEADER_BANNER.width - 18),
      {
        columns: [
          {
            width: "*",
            ...sectionTable("INTERN DETAILS", [
              [
                detailCell("INTERN ID", invoice.internId),
                detailCell("INTERN NAME", invoice.employeeName),
              ],
              [
                detailCell("E-MAIL", invoice.email),
                detailCell("PHONE", invoice.phone),
              ],
              [
                detailCell("COLLEGE", invoice.collegeName),
                detailCell("DEPARTMENT", invoice.courseMajor),
              ],
              [
                detailCell("PASSED OUT", invoice.passedOut),
                detailCell(
                  "ADDRESS",
                  invoice.address ? "Available below" : "-",
                ),
              ],
            ]),
          },
          {
            width: "*",
            ...sectionTable("INVOICE & PAYMENT DETAILS", [
              [
                detailCell("INVOICE DT", formatDate(invoice.invoiceDate)),
                detailCell("INVOICE ID", invoice.invoiceId),
              ],
              [
                detailCell("PAYMENT ID", invoice.paymentId),
                detailCell("PAYMENT STATUS", paymentStatus),
              ],
              [
                detailCell("SAC CODE", taxBreakdown.sacCode),
                detailCell("BILLING TYPE", "Internship"),
              ],
              [
                detailCell("GENERATED BY", generatedBy),
                detailCell(
                  "GST @18%",
                  `(CGST ${taxBreakdown.cgstRate}% + SGST ${taxBreakdown.sgstRate}%)`,
                ),
              ],
            ]),
          },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    text: `ADDRESS OF INTERN :  ${invoice.address || "-"} `,
                    style: "sectionTitle",
                  },
                ],
                fillColor: COLORS.panel,
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
        margin: [0, 0, 0, 8],
      },
      {
        margin: [0, 0, 0, 9],
        table: {
          headerRows: 2,
          widths: [28, 125, 43, 50, 65, 55, 55, 58],
          body: [
            [
              {
                text: "PAYMENT DETAILS",
                alignment: "center",
                style: "sectionTitle",
                colSpan: 8,
                fillColor: "#FFFFFF",
              },
              {},
              {},
              {},
              {},
              {},
              {},
              {},
            ],
            [
              { text: "S.No", style: "tableHeader", alignment: "center" },
              { text: "Description", style: "tableHeader" },
              { text: "SAC", style: "tableHeader", alignment: "center" },
              {
                text: "Duration",
                style: "tableHeader",
                alignment: "center",
              },
              { text: "Taxable", style: "tableHeader", alignment: "right" },
              {
                text: `CGST ${taxBreakdown.cgstRate}%`,
                style: "tableHeader",
                alignment: "right",
              },
              {
                text: `SGST ${taxBreakdown.sgstRate}%`,
                style: "tableHeader",
                alignment: "right",
              },
              { text: "Total", style: "tableHeader", alignment: "right" },
            ],
            [
              { text: "1", alignment: "center", margin: [0, 14, 0, 12] },
              {
                text: [
                  {
                    text: invoice.position || "Internship Service",
                    bold: true,
                  },
                  {
                    text: "\nProfessional internship program fee",
                    color: "#64748b",
                    fontSize: 7.5,
                  },
                ],
                margin: [0, 14, 0, 12],
              },
              {
                text: taxBreakdown.sacCode,
                alignment: "center",
                bold: true,
                margin: [0, 14, 0, 12],
              },
              {
                text: invoice.duration || "-",
                alignment: "center",
                margin: [0, 14, 0, 12],
              },
              {
                text: formatMoney(taxBreakdown.taxableValue),
                alignment: "right",
                margin: [0, 14, 0, 12],
              },
              {
                text: formatMoney(taxBreakdown.cgstAmount),
                alignment: "right",
                margin: [0, 14, 0, 12],
              },
              {
                text: formatMoney(taxBreakdown.sgstAmount),
                alignment: "right",
                margin: [0, 14, 0, 12],
              },
              {
                text: formatMoney(taxBreakdown.total),
                alignment: "right",
                bold: true,
                margin: [0, 14, 0, 12],
              },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 1 ? COLORS.navy : "#FFFFFF"),
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                stack: [
                  { text: "TERMS & CONDITIONS", style: "sectionTitle" },
                  {
                    ul: INTERN_INVOICE_TERMS.map((term) => ({
                      text: term,
                      margin: [0, 0, 0, 4],
                    })),
                    margin: [0, 9, 0, 0],
                    lineHeight: 1.2,
                  },
                  {
                    text: "This is a computer-generated invoice.",
                    margin: [0, 8, 0, 0],
                    color: COLORS.muted,
                  },
                ],
                margin: [10, 14, 10, 14],
              },
              {
                stack: [
                  { text: "INVOICE SUMMARY", style: "sectionTitle" },
                  {
                    table: {
                      widths: ["*", 94],
                      body: [
                        summaryRow("Taxable Amount", taxBreakdown.taxableValue),
                        summaryRow(
                          `CGST (${taxBreakdown.cgstRate}%)`,
                          taxBreakdown.cgstAmount,
                        ),
                        summaryRow(
                          `SGST (${taxBreakdown.sgstRate}%)`,
                          taxBreakdown.sgstAmount,
                        ),
                        summaryRow("Invoice Total", taxBreakdown.total, {
                          bold: true,
                          color: COLORS.navy,
                        }),
                        summaryRow(
                          "Amount Paid",
                          invoice.paymentReceived ? taxBreakdown.total : 0,
                        ),
                        summaryRow(
                          "Balance",
                          invoice.paymentReceived ? 0 : taxBreakdown.total,
                          {
                            bold: true,
                            color: "#16A34A",
                          },
                        ),
                      ],
                    },
                    layout: "noBorders",
                    margin: [0, 8, 0, 0],
                  },
                ],
                margin: [10, 14, 10, 14],
              },
            ],
          ],
        },
        layout: cardLayout,
        fontSize: 8,
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ["*", 150],
          body: [
            [
              {
                stack: [
                  {
                    text: "For Bit Byte Technologies",
                    fontSize: 9.5,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 0, 0, 50],
                  },
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 190,
                        y2: 0,
                        lineWidth: 0.7,
                        lineColor: COLORS.navy,
                      },
                    ],
                    alignment: "left",
                  },
                  {
                    text: "Authorized Signatory",
                    alignment: "left",
                    fontSize: 9.5,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 4, 0, 0],
                  },
                ],
                margin: [12, 14, 12, 24],
              },
              {
                stack: [
                  {
                    text: "QR VERIFICATION",
                    style: "sectionTitle",
                    alignment: "center",
                    margin: [0, 0, 0, 5],
                  },
                  {
                    text: "Scan to verify intern details",
                    alignment: "center",
                    fontSize: 7,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 0, 0, 5],
                  },
                  { svg: qrSvg(publicUrl), width: 66, alignment: "center" },
                ],
                margin: [8, 13, 8, 21],
              },
            ],
          ],
        },
        layout: cardLayout,
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ["*", 190],
          body: [
            [
              {
                stack: [
                  {
                    text: "Thank you",
                    fontSize: 14,
                    bold: true,
                    color: COLORS.navy,
                  },
                  {
                    text: "for choosing Bit Byte Technologies.",
                    fontSize: 8.5,
                    color: COLORS.muted,
                    margin: [0, 4, 0, 0],
                  },
                ],
                margin: [12, 34, 12, 42],
              },
              {
                stack: [
                  {
                    text: "PAYMENT CONFIRMED",
                    fontSize: 8.6,
                    bold: true,
                    color: COLORS.navy,
                    alignment: "center",
                  },
                  {
                    text: invoice.paymentId || "-",
                    fontSize: 8.2,
                    bold: true,
                    color: COLORS.blue,
                    alignment: "center",
                    margin: [0, 4, 0, 0],
                  },
                ],
                margin: [10, 34, 10, 42],
              },
            ],
          ],
        },
        layout: cardLayout,
        margin: [0, 0, 0, 0],
      },
    ],
    footer: () => ({
      margin: [18, 0, 18, 5],
      stack: [
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 559,
              y2: 0,
              lineWidth: 0.6,
              lineColor: COLORS.border,
            },
          ],
        },
        {
          columns: [
            {
              text: "Intern invoice generated by Bit Byte Technologies billing system.",
              fontSize: 6.8,
              color: COLORS.muted,
              margin: [0, 5, 0, 0],
            },
            {
              stack: [
                {
                  text: "Email Id : reachus@bitbytetech.org",
                  fontSize: 6.8,
                  color: COLORS.navy,
                },
                {
                  text: "Contact No : 9943743136",
                  fontSize: 6.8,
                  color: COLORS.navy,
                  margin: [0, 1, 0, 0],
                },
              ],
              alignment: "center",
              margin: [0, 5, 0, 0],
            },
            {
              text: `Generated on ${formatDateTime(invoice.createdAt || new Date())}`,
              alignment: "right",
              fontSize: 6.8,
              color: COLORS.muted,
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],
    }),
    styles: {
      label: {
        fontSize: 6.6,
        color: COLORS.muted,
        bold: true,
        characterSpacing: 0.4,
      },
      value: {
        fontSize: 8,
        color: COLORS.text,
        bold: true,
        margin: [0, 2, 0, 0],
      },
      tableHeader: {
        bold: true,
        fontSize: 6.1,
        color: "#ffffff",
      },
      boxTitle: {
        fontSize: 9,
        bold: true,
        color: COLORS.navy,
      },
      sectionTitle: {
        fontSize: 8.6,
        bold: true,
        color: COLORS.navy,
        margin: [0, 0, 0, 6],
      },
    },
    defaultStyle: { font: "Roboto", fontSize: 8, color: "#0f172a" },
  };

  return printer.createPdfKitDocument(docDefinition);
}

export function internInvoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = createInternInvoicePdfDocument(invoice);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
