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
const logoPath = ["Logo.png", "logo.png", "logo.svg"]
  .map((file) => path.resolve(__dirname, "../../../client/public", file))
  .find((file) => existsSync(file));
const companyLogo =
  logoPath && existsSync(logoPath)
    ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
    : null;

const COMPANY = {
  name: "Bit Byte Technologies",
  office: "Corporate Office",
  address: ["2nd Floor, Raja Complex", "Salem, Tamil Nadu - 636302", "India"],
  gstin: process.env.COMPANY_GSTIN || "33BLNPN539J1ZL",
  udyamId: process.env.COMPANY_UDYAM_ID || "UDYAM-TN-20-0234773",
};

const INTERN_INVOICE_TAX = {
  sacCode: "999293",
  cgstRate: 9,
  sgstRate: 9,
};

function internInvoiceTaxBreakdown(totalAmount) {
  const total = Number(totalAmount || 0);
  const totalTaxRate = INTERN_INVOICE_TAX.cgstRate + INTERN_INVOICE_TAX.sgstRate;
  const taxableValue = totalTaxRate ? (total * 100) / (100 + totalTaxRate) : total;
  const cgstAmount = (taxableValue * INTERN_INVOICE_TAX.cgstRate) / 100;
  const sgstAmount = (taxableValue * INTERN_INVOICE_TAX.sgstRate) / 100;
  return {
    ...INTERN_INVOICE_TAX,
    taxableValue,
    cgstAmount,
    sgstAmount,
    total,
  };
}

function normalizeAbsoluteUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "https://bit-byte-billing-client.vercel.app";
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function publicInternInvoiceUrl(invoice) {
  const baseUrl = normalizeAbsoluteUrl(process.env.CLIENT_URL || process.env.APP_URL);
  const publicId = invoice._id || invoice.id || invoice.invoiceId || invoice.internId;
  return `${baseUrl}/public/intern-invoice/${encodeURIComponent(String(publicId || ""))}`;
}

function qrSvg(value) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M", margin: 1 });
  const size = qr.modules.size;
  const cells = qr.modules.data;
  const rects = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (cells[y * size + x]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
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
    sacCode: getSacCode(serviceName),
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
  const clientName =
    invoice.clientId?.companyName || invoice.clientId?.fullName || "Client";
  const quotationLabel =
    invoice.quotationId?.quotationId ||
    invoice.quotationId?.projectTitle ||
    "-";
  const itemRows = items.map((item, index) => [
    { text: String(index + 1), alignment: "center", margin: [0, 5, 0, 5] },
    {
      text: [item.service, item.description ? `\n${item.description}` : ""]
        .filter(Boolean)
        .join(""),
      fontSize: 8,
      bold: true,
      margin: [0, 5, 0, 5],
    },
    {
      text: item.sacCode,
      alignment: "center",
      fontSize: 8,
      margin: [0, 5, 0, 5],
    },
    { text: String(item.quantity), alignment: "center", margin: [0, 5, 0, 5] },
    {
      text: formatMoney(item.taxableValue),
      alignment: "right",
      margin: [0, 5, 0, 5],
    },
    {
      text: formatMoney(item.cgstAmount),
      alignment: "right",
      margin: [0, 5, 0, 5],
    },
    {
      text: formatMoney(item.sgstAmount),
      alignment: "right",
      margin: [0, 5, 0, 5],
    },
    {
      text: formatMoney(item.igstAmount),
      alignment: "right",
      margin: [0, 5, 0, 5],
    },
    {
      text: formatMoney(item.total),
      alignment: "right",
      bold: true,
      margin: [0, 5, 0, 5],
    },
  ]);

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

  if (!itemRows.length) {
    itemRows.push([
      {
        text: "No invoice line items available.",
        colSpan: 9,
        alignment: "center",
        color: "#64748b",
        margin: [0, 12, 0, 12],
      },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
    ]);
  }

  const detailCell = (label, value) => ({
    stack: [
      { text: label, style: "label" },
      { text: value || "-", style: "value" },
    ],
    margin: [0, 0, 0, 12],
  });

  const totalRow = (label, value, options = {}) => [
    {
      text: label,
      bold: options.bold || false,
      color: options.color || "#334155",
    },
    {
      text: `Rs ${formatMoney(value)}`,
      alignment: "right",
      bold: options.bold || false,
      color: options.color || "#0f172a",
    },
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [42, 38, 42, 58],
    content: [
      {
        columns: [
          {
            text: formatDateTime(invoice.createdAt || invoice.invoiceDate),
            fontSize: 7.5,
            color: "#0f172a",
          },
          {
            text: invoice.invoiceId || "-",
            alignment: "right",
            fontSize: 7.5,
            color: "#0f172a",
            bold: true,
          },
        ],
        margin: [0, 0, 0, 24],
      },
      {
        columns: [
          {
            width: "*",
            columns: [
              ...(companyLogo
                ? [{ image: companyLogo, width: 58, margin: [0, 2, 12, 0] }]
                : []),
              {
                width: "*",
                stack: [
                  {
                    text: COMPANY.name,
                    bold: true,
                    fontSize: 16,
                    color: "#a3a3a3",
                  },
                  {
                    text: COMPANY.office,
                    fontSize: 9,
                    color: "#94a3b8",
                    margin: [0, 3, 0, 0],
                  },
                  ...COMPANY.address.map((line) => ({
                    text: line,
                    fontSize: 8.5,
                    color: "#94a3b8",
                  })),
                  ...(COMPANY.gstin
                    ? [
                        {
                          text: `GSTIN: ${COMPANY.gstin}`,
                          fontSize: 8.5,
                          color: "#94a3b8",
                        },
                      ]
                    : []),
                ],
              },
            ],
          },
          {
            width: 170,
            stack: [
              {
                text: "Tax Invoice",
                alignment: "right",
                fontSize: 8.5,
                color: "#c4c4c4",
                bold: true,
              },
              {
                text: invoice.invoiceId || "-",
                alignment: "right",
                fontSize: 16,
                color: "#a3a3a3",
                bold: true,
              },
            ],
            margin: [0, 14, 0, 0],
          },
        ],
        margin: [24, 0, 24, 36],
      },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              detailCell("CLIENT NAME", clientName),
              detailCell("INVOICE ID", invoice.invoiceId || "-"),
            ],
            [
              detailCell("EMAIL", invoice.clientId?.email || "-"),
              detailCell("INVOICE DATE", formatDate(invoice.invoiceDate)),
            ],
            [
              detailCell("PHONE", invoice.clientId?.phone || "-"),
              detailCell("DUE DATE", formatDate(invoice.dueDate)),
            ],
            [
              detailCell("QUOTATION", quotationLabel),
              detailCell("PAYMENT STATUS", invoice.paymentStatus || "Pending"),
            ],
          ],
        },
        layout: "noBorders",
        margin: [24, 0, 24, 8],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 511,
            y2: 0,
            lineWidth: 0.7,
            lineColor: "#e2e8f0",
          },
        ],
        margin: [0, 0, 0, 18],
      },
      {
        margin: [0, 0, 0, 16],
        table: {
          headerRows: 1,
          widths: [22, "*", 42, 24, 56, 44, 44, 44, 58],
          body: [
            [
              { text: "S.No", style: "tableHeader", alignment: "center" },
              { text: "Description of Service", style: "tableHeader" },
              { text: "SAC", style: "tableHeader", alignment: "center" },
              { text: "Qty", style: "tableHeader", alignment: "center" },
              {
                text: "Taxable Value (Rs)",
                style: "tableHeader",
                alignment: "right",
              },
              {
                text: "CGST (9%)",
                style: "tableHeader",
                alignment: "right",
              },
              {
                text: "SGST (9%)",
                style: "tableHeader",
                alignment: "right",
              },
              {
                text: "IGST (18%)",
                style: "tableHeader",
                alignment: "right",
              },
              {
                text: "Total (Rs)",
                style: "tableHeader",
                alignment: "right",
              },
            ],
            ...itemRows,
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? "#f8fafc" : null),
          hLineWidth: (rowIndex) => (rowIndex === 0 ? 0 : 0.6),
          vLineWidth: () => 0.6,
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
      },
      {
        columns: [
          {
            width: "*",
            table: {
              widths: ["*", "*"],
              body: [
                [
                  {
                    stack: [
                      { text: "Payment Terms", style: "boxTitle" },
                      {
                        text: "1. Payment is due on or before the invoice due date.",
                        margin: [0, 8, 0, 0],
                      },
                      {
                        text: "2. Please mention the invoice number for all payments.",
                      },
                      {
                        text: "3. Taxes are calculated as per applicable GST rules.",
                      },
                      { text: "4. This is a computer-generated invoice." },
                    ],
                    margin: [12, 10, 12, 10],
                  },
                  {
                    stack: [
                      { text: "Invoice Summary", style: "boxTitle" },
                      {
                        table: {
                          widths: ["*", 88],
                          body: [
                            totalRow("Taxable Subtotal", totals.taxable),
                            totalRow("CGST Total", totals.cgst),
                            totalRow("SGST Total", totals.sgst),
                            totalRow("IGST Total", totals.igst),
                            totalRow("Discount", invoice.discountedAmount || 0),
                            totalRow("Invoice Total", invoice.totalAmount, {
                              bold: true,
                            }),
                            totalRow("Amount Paid", invoice.amountPaid || 0),
                            totalRow("Balance Pending", invoice.balanceDue, {
                              bold: true,
                              color: "#b91c1c",
                            }),
                          ],
                        },
                        layout: "noBorders",
                        margin: [0, 8, 0, 0],
                      },
                    ],
                    margin: [12, 10, 12, 10],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.6,
              vLineWidth: () => 0.6,
              hLineColor: () => "#e2e8f0",
              vLineColor: () => "#e2e8f0",
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
          },
        ],
        fontSize: 8.5,
        margin: [24, 0, 24, 16],
      },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                stack: [
                  { text: "\n\n", margin: [0, 0, 0, 6] },
                  { text: "Client Signature", fontSize: 10, color: "#0f172a" },
                ],
                margin: [12, 14, 12, 14],
              },
              {
                stack: [
                  { text: "\n\n", margin: [0, 0, 0, 6] },
                  {
                    text: "Authorized Company Signature",
                    fontSize: 10,
                    color: "#0f172a",
                  },
                ],
                margin: [12, 14, 12, 14],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
        },
        margin: [24, 0, 24, 0],
      },
    ],
    footer: (currentPage, pageCount) => ({
      margin: [42, 0, 42, 24],
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
              lineColor: "#e2e8f0",
            },
          ],
        },
        {
          columns: [
            {
              text: "This invoice uses the Bit Byte Technologies printable document format.",
              fontSize: 7.5,
              color: "#0f172a",
              margin: [24, 12, 0, 0],
            },
            {
              text: `Generated on ${formatDate(invoice.createdAt || new Date())}`,
              alignment: "right",
              fontSize: 7.5,
              color: "#0f172a",
              margin: [0, 12, 24, 0],
            },
          ],
        },
        {
          text: `${currentPage}/${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: "#0f172a",
          margin: [0, 16, 0, 0],
        },
      ],
    }),
    styles: {
      label: {
        fontSize: 7.5,
        color: "#334155",
        bold: true,
        characterSpacing: 0.4,
      },
      value: {
        fontSize: 9.5,
        color: "#0f172a",
        bold: true,
        margin: [0, 3, 0, 0],
      },
      tableHeader: {
        bold: true,
        fontSize: 7,
        color: "#334155",
      },
      boxTitle: {
        fontSize: 9,
        bold: true,
        color: "#0f172a",
      },
    },
    defaultStyle: { font: "Roboto", fontSize: 8, color: "#0f172a" },
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
    invoice.createdBy?.name ||
    invoice.createdBy?.email ||
    "BBTech Billing Team";
  const termsText = "This amount is non-refundable.";
  const publicUrl = publicInternInvoiceUrl(invoice);
  const COLORS = {
    blue: "#0F7CEB",
    green: "#6BCB2D",
    navy: "#0F172A",
    text: "#111827",
    muted: "#4B5563",
    border: "#D9DEE7",
    bg: "#F8FAFC",
    panel: "#F8FAFC",
  };
  const detailCell = (label, value, options = {}) => ({
    stack: [
      { text: label, style: "label" },
      { text: value || "-", style: "value", color: options.color || COLORS.text },
    ],
    fillColor: options.fillColor,
    margin: options.margin || [0, 0, 0, 0],
  });
  const sectionHeaderCell = (label) => ({
    text: label,
    style: "sectionTitle",
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
    paddingTop: () => 4,
    paddingBottom: () => 4,
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
      body: [
        [{ ...sectionHeaderCell(title), colSpan: 2 }, {}],
        ...rows,
      ],
    },
    layout: detailTableLayout,
  });

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [18, 14, 18, 24],
    content: [
      {
        canvas: [
          { type: "line", x1: 0, y1: 0, x2: 279.5, y2: 0, lineWidth: 2, lineColor: COLORS.blue },
          { type: "line", x1: 279.5, y1: 0, x2: 559, y2: 0, lineWidth: 2, lineColor: COLORS.green },
        ],
        margin: [0, 0, 0, 0],
      },
      {
        table: {
          widths: [138, "*"],
          body: [
            [
              {
                stack: companyLogo
                  ? [{ image: companyLogo, width: 106, alignment: "center" }]
                  : [{ text: COMPANY.name, alignment: "center", bold: true, color: COLORS.blue }],
                alignment: "center",
                fillColor: COLORS.navy,
                margin: [0, 12, 0, 12],
              },
              {
                stack: [
                  {
                    text: [
                      { text: "Bit Byte", color: COLORS.blue },
                      { text: " Technologies", color: COLORS.green },
                    ],
                    bold: true,
                    fontSize: 26,
                    margin: [0, 0, 0, 7],
                  },
                  { text: COMPANY.office, fontSize: 9.8, bold: true, color: "#FFFFFF", margin: [0, 0, 0, 1] },
                  ...COMPANY.address.map((line) => ({ text: line, fontSize: 8.8, color: "#FFFFFF" })),
                  { text: `GST NO : ${COMPANY.gstin}`, fontSize: 10, bold: true, color: "#FFFFFF", margin: [0, 7, 0, 0] },
                  { text: `Udyam ID : ${COMPANY.udyamId}`, fontSize: 10, bold: true, color: "#FFFFFF" },
                ],
                fillColor: COLORS.navy,
                margin: [18, 23, 0, 12],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: (lineIndex) => (lineIndex === 1 ? 0.8 : 0.6),
          hLineColor: () => COLORS.border,
          vLineColor: () => COLORS.border,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            width: "*",
            ...sectionTable("INTERN DETAILS", [
              [detailCell("INTERN ID", invoice.internId), detailCell("INTERN NAME", invoice.employeeName)],
              [detailCell("E-MAIL", invoice.email), detailCell("PHONE", invoice.phone)],
              [detailCell("COLLEGE", invoice.collegeName), detailCell("DEPARTMENT", invoice.courseMajor)],
              [detailCell("PASSED OUT", invoice.passedOut), detailCell("ADDRESS REF", invoice.address ? "Available below" : "-")],
            ]),
          },
          {
            width: "*",
            ...sectionTable("INVOICE & PAYMENT DETAILS", [
              [detailCell("INVOICE DT", formatDate(invoice.invoiceDate)), detailCell("INVOICE ID", invoice.invoiceId)],
              [detailCell("PAYMENT ID", invoice.paymentId), detailCell("PAYMENT STATUS", paymentStatus)],
              [detailCell("SAC CODE", taxBreakdown.sacCode), detailCell("BILLING TYPE", "Internship")],
              [detailCell("GENERATED BY", generatedBy), detailCell("GST", `CGST ${taxBreakdown.cgstRate}% + SGST ${taxBreakdown.sgstRate}%`)],
            ]),
          },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 9],
      },
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  { text: "ADDRESS OF INTERN", style: "sectionTitle" },
                  {
                    text: invoice.address || "-",
                    style: "value",
                    margin: [0, 6, 0, 0],
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
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 9],
      },
      {
        margin: [0, 0, 0, 10],
        table: {
          headerRows: 2,
          widths: [25, 124, 43, 48, 68, 58, 58, 68],
          body: [
            [
              { text: "PAYMENT DETAILS", style: "sectionTitle", colSpan: 8, fillColor: "#FFFFFF" },
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
              { text: `CGST ${taxBreakdown.cgstRate}%`, style: "tableHeader", alignment: "right" },
              { text: `SGST ${taxBreakdown.sgstRate}%`, style: "tableHeader", alignment: "right" },
              { text: "Total", style: "tableHeader", alignment: "right" },
            ],
            [
              { text: "1", alignment: "center", margin: [0, 10, 0, 10] },
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
                margin: [0, 10, 0, 10],
              },
              {
                text: taxBreakdown.sacCode,
                alignment: "center",
                bold: true,
                margin: [0, 10, 0, 10],
              },
              {
                text: invoice.duration || "-",
                alignment: "center",
                margin: [0, 10, 0, 10],
              },
              {
                text: formatMoney(taxBreakdown.taxableValue),
                alignment: "right",
                margin: [0, 10, 0, 10],
              },
              {
                text: formatMoney(taxBreakdown.cgstAmount),
                alignment: "right",
                margin: [0, 10, 0, 10],
              },
              {
                text: formatMoney(taxBreakdown.sgstAmount),
                alignment: "right",
                margin: [0, 10, 0, 10],
              },
              {
                text: formatMoney(taxBreakdown.total),
                alignment: "right",
                bold: true,
                margin: [0, 10, 0, 10],
              },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex) =>
            rowIndex === 1 ? COLORS.navy : "#FFFFFF",
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
                  { text: termsText, margin: [0, 9, 0, 0], lineHeight: 1.2 },
                  { text: "This is a computer-generated invoice.", margin: [0, 8, 0, 0], color: COLORS.muted },
                ],
                margin: [10, 10, 10, 10],
              },
              {
                stack: [
                  { text: "INVOICE SUMMARY", style: "sectionTitle" },
                  {
                    table: {
                      widths: ["*", 94],
                      body: [
                        summaryRow("Taxable Amount", taxBreakdown.taxableValue),
                        summaryRow(`CGST (${taxBreakdown.cgstRate}%)`, taxBreakdown.cgstAmount),
                        summaryRow(`SGST (${taxBreakdown.sgstRate}%)`, taxBreakdown.sgstAmount),
                        summaryRow("Invoice Total", taxBreakdown.total, {
                          bold: true,
                          color: COLORS.navy,
                        }),
                        summaryRow("Amount Paid", invoice.paymentReceived ? taxBreakdown.total : 0),
                        summaryRow("Balance", invoice.paymentReceived ? 0 : taxBreakdown.total, {
                          bold: true,
                          color: "#16A34A",
                        }),
                      ],
                    },
                    layout: "noBorders",
                    margin: [0, 8, 0, 0],
                  },
                ],
                margin: [10, 10, 10, 10],
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
                  { text: "AUTHORIZED SIGNATORY", style: "sectionTitle", margin: [0, 0, 0, 48] },
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 170,
                        y2: 0,
                        lineWidth: 0.7,
                        lineColor: COLORS.navy,
                      },
                    ],
                    alignment: "right",
                  },
                  {
                    text: "Authorized Signatory",
                    alignment: "right",
                    fontSize: 9.5,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 6, 0, 0],
                  },
                  {
                    text: COMPANY.name,
                    alignment: "right",
                    fontSize: 8,
                    color: COLORS.blue,
                  },
                ],
                margin: [12, 10, 12, 14],
              },
              {
                stack: [
                  { text: "QR VERIFICATION", style: "sectionTitle", alignment: "center", margin: [0, 0, 0, 5] },
                  {
                    text: "Scan to verify intern details",
                    alignment: "center",
                    fontSize: 7,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 0, 0, 7],
                  },
                  { svg: qrSvg(publicUrl), width: 66, alignment: "center" },
                ],
                margin: [8, 9, 8, 9],
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
                  { text: "Thank you", fontSize: 14, bold: true, color: COLORS.navy },
                  { text: "for choosing Bit Byte Technologies.", fontSize: 8.5, color: COLORS.muted, margin: [0, 6, 0, 0] },
                ],
                margin: [12, 21, 12, 21],
              },
              {
                stack: [
                  { text: "PAYMENT CONFIRMED", fontSize: 8.6, bold: true, color: COLORS.navy, alignment: "center" },
                  { text: invoice.paymentId || "-", fontSize: 8.2, bold: true, color: COLORS.blue, alignment: "center", margin: [0, 6, 0, 0] },
                ],
                margin: [10, 21, 10, 21],
              },
            ],
          ],
        },
        layout: cardLayout,
        margin: [0, 0, 0, 0],
      },
    ],
    footer: () => ({
      margin: [18, 0, 18, 7],
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
                { text: "Email Id : reachus@bitbytetech.org", fontSize: 6.8, color: COLORS.navy },
                { text: "Contact No : 9943743136", fontSize: 6.8, color: COLORS.navy, margin: [0, 1, 0, 0] },
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
