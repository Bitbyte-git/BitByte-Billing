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
    muted: "#64748B",
    border: "#E5E7EB",
    softBorder: "#D7E3F0",
    bg: "#F8FBFF",
    panel: "#F8FAFC",
  };
  const gradientStrip = (height = 5) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 539 ${height}"><rect x="0" y="0" width="108" height="${height}" fill="#0F7CEB"/><rect x="108" y="0" width="108" height="${height}" fill="#1286E7"/><rect x="216" y="0" width="108" height="${height}" fill="#179BD6"/><rect x="324" y="0" width="108" height="${height}" fill="#31B98A"/><rect x="432" y="0" width="107" height="${height}" fill="#6BCB2D"/></svg>`;
  const iconSvg = (type, color = COLORS.blue, fill = "#EEF6FF") => {
    const paths = {
      user: '<circle cx="12" cy="8" r="3.1"/><path d="M5.8 19c.7-3.1 3-5 6.2-5s5.5 1.9 6.2 5"/>',
      invoice: '<path d="M8 5h7l3 3v11H8z"/><path d="M15 5v4h3"/><path d="M10 12h6M10 15h5"/>',
      location: '<path d="M12 21s6-5.1 6-10a6 6 0 0 0-12 0c0 4.9 6 10 6 10z"/><circle cx="12" cy="11" r="2"/>',
      shield: '<path d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-5"/>',
      summary: '<path d="M6 5h12v14H6z"/><path d="M9 9h6M9 13h3M14 13h1M9 16h3M14 16h1"/>',
      heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${fill}"/><g fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[type] || paths.invoice}</g></svg>`;
  };
  const detailCell = (label, value, options = {}) => ({
    stack: [
      { text: label, style: "label" },
      { text: value || "-", style: "value", color: options.color || COLORS.text },
    ],
    fillColor: options.fillColor,
    margin: options.margin || [0, 0, 0, 0],
  });
  const sectionHeaderCell = (label, icon) => ({
    columns: [
      { svg: iconSvg(icon, "#FFFFFF", COLORS.navy), width: 22 },
      { text: "", width: 10 },
      { text: label, style: "sectionTitle", margin: [0, 4, 0, 0] },
    ],
    fillColor: "#FFFFFF",
    margin: [0, 0, 0, 0],
  });
  const detailTableLayout = {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.softBorder,
    vLineColor: () => COLORS.softBorder,
    paddingLeft: () => 10,
    paddingRight: () => 10,
    paddingTop: () => 8,
    paddingBottom: () => 8,
  };
  const summaryRow = (label, value, options = {}) => [
    {
      text: label,
      bold: options.bold || false,
      color: options.color || COLORS.navy,
      margin: [0, 4, 0, 4],
    },
    {
      text: `Rs ${formatMoney(value)}`,
      alignment: "right",
      bold: options.bold || false,
      color: options.color || COLORS.navy,
      margin: [0, 4, 0, 4],
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

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [28, 24, 28, 36],
    content: [
      { svg: gradientStrip(5), width: 539, margin: [0, 0, 0, 0] },
      {
        table: {
          widths: [142, "*"],
          body: [
            [
              {
                stack: companyLogo
                  ? [{ image: companyLogo, width: 126, alignment: "center" }]
                  : [{ text: COMPANY.name, alignment: "center", bold: true, color: COLORS.blue }],
                alignment: "center",
                fillColor: COLORS.bg,
                margin: [0, 18, 0, 18],
              },
              {
                stack: [
                  {
                    text: [
                      { text: "Bit Byte", color: COLORS.blue },
                      { text: "\nTechnologies", color: COLORS.green },
                    ],
                    bold: true,
                    fontSize: 34,
                    lineHeight: 0.88,
                    margin: [0, 0, 0, 7],
                  },
                  { text: COMPANY.office, fontSize: 10.5, bold: true, color: "#064E9B", margin: [0, 0, 0, 2] },
                  ...COMPANY.address.map((line) => ({ text: line, fontSize: 9.5, color: COLORS.navy })),
                  { text: `GST NO : ${COMPANY.gstin}`, fontSize: 8.5, color: COLORS.navy, margin: [0, 6, 0, 0] },
                  { text: `Udyam ID : ${COMPANY.udyamId}`, fontSize: 8.5, color: COLORS.navy },
                ],
                fillColor: COLORS.bg,
                margin: [20, 12, 0, 13],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: (lineIndex) => (lineIndex === 1 ? 0.8 : 0.6),
          hLineColor: () => COLORS.softBorder,
          vLineColor: () => COLORS.softBorder,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 9],
      },
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              { ...sectionHeaderCell("Intern Details", "user"), colSpan: 2 },
              {},
              { ...sectionHeaderCell("Invoice & Payment Details", "invoice"), colSpan: 2 },
              {},
            ],
            [
              detailCell("INTERN ID", invoice.internId),
              detailCell("INTERN NAME", invoice.employeeName),
              detailCell("INVOICE DT", formatDate(invoice.invoiceDate)),
              detailCell("INVOICE ID", invoice.invoiceId),
            ],
            [
              detailCell("E-MAIL", invoice.email),
              detailCell("PHONE", invoice.phone),
              detailCell("PAYMENT ID", invoice.paymentId),
              detailCell("PAYMENT STATUS", paymentStatus, {
                color: invoice.paymentReceived ? "#16A34A" : "#B45309",
              }),
            ],
            [
              detailCell("COLLEGE", invoice.collegeName),
              detailCell("DEPARTMENT", invoice.courseMajor),
              detailCell("GENERATED BY", generatedBy),
              detailCell("BILLING TYPE", "Internship"),
            ],
            [
              detailCell("PASSED OUT", invoice.passedOut),
              detailCell("ADDRESS REF", invoice.address ? "Available below" : "-"),
              { text: "", colSpan: 2 },
              {},
            ],
          ],
        },
        layout: detailTableLayout,
        margin: [0, 0, 0, 9],
      },
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                columns: [
                  { svg: iconSvg("location", "#FFFFFF", COLORS.blue), width: 22, margin: [0, 2, 10, 0] },
                  {
                    stack: [
                      { text: "ADDRESS OF INTERN", style: "label" },
                      {
                        text: invoice.address || "-",
                        style: "value",
                        margin: [0, 4, 0, 0],
                      },
                    ],
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
          hLineColor: () => COLORS.softBorder,
          vLineColor: () => COLORS.softBorder,
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
        margin: [0, 0, 0, 10],
      },
      {
        margin: [0, 0, 0, 10],
        table: {
          headerRows: 1,
          widths: [36, "*", 92, 88],
          body: [
            [
              { text: "S.No", style: "tableHeader", alignment: "center" },
              { text: "Description", style: "tableHeader" },
              {
                text: "Duration",
                style: "tableHeader",
                alignment: "center",
              },
              { text: "Amount (Rs)", style: "tableHeader", alignment: "right" },
            ],
            [
              { text: "1", alignment: "center", margin: [0, 5, 0, 5] },
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
                margin: [0, 5, 0, 5],
              },
              {
                text: invoice.duration || "-",
                alignment: "center",
                margin: [0, 5, 0, 5],
              },
              {
                text: formatMoney(amount),
                alignment: "right",
                bold: true,
                margin: [0, 5, 0, 5],
              },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex) =>
            rowIndex === 0 ? COLORS.navy : "#FFFFFF",
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => COLORS.softBorder,
          vLineColor: () => COLORS.softBorder,
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
      {
        columns: [
          {
            width: "*",
            columns: [
              { svg: iconSvg("shield", COLORS.blue, "#EEF6FF"), width: 26, margin: [0, 1, 10, 0] },
              {
                stack: [
                  { text: "Terms & Conditions", style: "boxTitle" },
                  { text: termsText, margin: [0, 7, 0, 0], lineHeight: 1.2 },
                  {
                    text: "This is a computer-generated invoice.",
                    margin: [0, 7, 0, 0],
                    color: COLORS.muted,
                  },
                ],
              },
            ],
            margin: [12, 8, 12, 8],
          },
          {
            width: 1,
            canvas: [
              { type: "line", x1: 0, y1: 0, x2: 0, y2: 84, lineWidth: 0.6, lineColor: COLORS.softBorder },
            ],
          },
          {
            width: 204,
            columns: [
              { svg: iconSvg("summary", COLORS.green, "#ECFDF5"), width: 26, margin: [0, 1, 10, 0] },
              {
                stack: [
                  { text: "Invoice Summary", style: "boxTitle" },
                  {
                    table: {
                      widths: ["*", 86],
                      body: [
                        summaryRow("Service Amount", amount),
                        summaryRow("Amount Paid", invoice.paymentReceived ? amount : 0, { bold: true }),
                        summaryRow("Balance", invoice.paymentReceived ? 0 : amount, {
                          bold: true,
                          color: "#16A34A",
                        }),
                      ],
                    },
                    layout: "noBorders",
                    margin: [0, 7, 0, 0],
                  },
                ],
              },
            ],
            margin: [12, 8, 12, 8],
          },
        ],
        columnGap: 10,
        fontSize: 8.5,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  { text: "\n\n", margin: [0, 0, 0, 2] },
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 140,
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
                margin: [14, 9, 14, 9],
              },
            ],
          ],
        },
        layout: cardLayout,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ["*", 174],
          body: [
            [
              {
                columns: [
                  { svg: iconSvg("heart", COLORS.green, "#EEF6FF"), width: 32, margin: [0, 0, 12, 0] },
                  {
                    stack: [
                      {
                        text: "Thank you",
                        fontSize: 15,
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
                  },
                ],
                margin: [14, 12, 14, 12],
              },
              {
                stack: [
                  {
                    text: "Scan to verify intern details",
                    alignment: "center",
                    fontSize: 7.5,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 0, 0, 6],
                  },
                  { svg: qrSvg(publicUrl), width: 68, alignment: "center" },
                ],
                margin: [8, 8, 8, 8],
              },
            ],
          ],
        },
        layout: cardLayout,
        margin: [0, 0, 0, 0],
      },
      { svg: gradientStrip(5), width: 539, margin: [0, 8, 0, 0] },
    ],
    footer: () => ({
      margin: [28, 0, 28, 14],
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
              text: "Intern invoice generated by Bit Byte Technologies billing system.",
              fontSize: 7.5,
              color: COLORS.muted,
              margin: [0, 10, 0, 0],
            },
            {
              text: `Generated on ${formatDateTime(invoice.createdAt || new Date())}`,
              alignment: "right",
              fontSize: 7.5,
              color: COLORS.muted,
              margin: [0, 10, 0, 0],
            },
          ],
        },
      ],
    }),
    styles: {
      label: {
        fontSize: 7.3,
        color: "#1E40AF",
        bold: true,
        characterSpacing: 0.4,
      },
      value: {
        fontSize: 9.2,
        color: COLORS.text,
        bold: true,
        margin: [0, 3, 0, 0],
      },
      tableHeader: {
        bold: true,
        fontSize: 7,
        color: "#ffffff",
      },
      boxTitle: {
        fontSize: 9,
        bold: true,
        color: COLORS.navy,
      },
      sectionTitle: {
        fontSize: 10.5,
        bold: true,
        color: COLORS.navy,
        margin: [0, 0, 0, 10],
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
