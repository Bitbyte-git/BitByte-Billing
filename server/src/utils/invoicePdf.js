import { existsSync, readFileSync } from "fs";
import path from "path";
import PdfPrinter from "pdfmake";
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
const companyLogo = logoPath && existsSync(logoPath)
  ? `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`
  : null;

const COMPANY = {
  name: "Bit Byte Technologies",
  office: "Corporate Office",
  address: ["2nd Floor, Raja Complex", "Salem, Tamil Nadu - 636302", "India"],
  gstin: process.env.COMPANY_GSTIN || "",
};

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
    invoice.quotationId?.quotationId || invoice.quotationId?.projectTitle || "-";
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
    { text: item.sacCode, alignment: "center", fontSize: 8, margin: [0, 5, 0, 5] },
    { text: String(item.quantity), alignment: "center", margin: [0, 5, 0, 5] },
    { text: formatMoney(item.taxableValue), alignment: "right", margin: [0, 5, 0, 5] },
    { text: formatMoney(item.cgstAmount), alignment: "right", margin: [0, 5, 0, 5] },
    { text: formatMoney(item.sgstAmount), alignment: "right", margin: [0, 5, 0, 5] },
    { text: formatMoney(item.igstAmount), alignment: "right", margin: [0, 5, 0, 5] },
    { text: formatMoney(item.total), alignment: "right", bold: true, margin: [0, 5, 0, 5] },
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
      {}, {}, {}, {}, {}, {}, {}, {},
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
    { text: label, bold: options.bold || false, color: options.color || "#334155" },
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
          { text: formatDateTime(invoice.createdAt || invoice.invoiceDate), fontSize: 7.5, color: "#0f172a" },
          { text: invoice.invoiceId || "-", alignment: "right", fontSize: 7.5, color: "#0f172a", bold: true },
        ],
        margin: [0, 0, 0, 24],
      },
      {
        columns: [
          {
            width: "*",
            columns: [
              ...(companyLogo ? [{ image: companyLogo, width: 38, margin: [0, 2, 12, 0] }] : []),
              {
                width: "*",
                stack: [
                  { text: COMPANY.name, bold: true, fontSize: 16, color: "#a3a3a3" },
                  { text: COMPANY.office, fontSize: 9, color: "#94a3b8", margin: [0, 3, 0, 0] },
                  ...COMPANY.address.map((line) => ({ text: line, fontSize: 8.5, color: "#94a3b8" })),
                  ...(COMPANY.gstin ? [{ text: `GSTIN: ${COMPANY.gstin}`, fontSize: 8.5, color: "#94a3b8" }] : []),
                ],
              },
            ],
          },
          {
            width: 170,
            stack: [
              { text: "Tax Invoice", alignment: "right", fontSize: 8.5, color: "#c4c4c4", bold: true },
              { text: invoice.invoiceId || "-", alignment: "right", fontSize: 16, color: "#a3a3a3", bold: true },
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
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 0.7, lineColor: "#e2e8f0" }],
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
                      { text: "1. Payment is due on or before the invoice due date.", margin: [0, 8, 0, 0] },
                      { text: "2. Please mention the invoice number for all payments." },
                      { text: "3. Taxes are calculated as per applicable GST rules." },
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
                            totalRow("Invoice Total", invoice.totalAmount, { bold: true }),
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
                  { text: "Authorized Company Signature", fontSize: 10, color: "#0f172a" },
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
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 0.6, lineColor: "#e2e8f0" }] },
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
  const generatedBy = invoice.createdBy?.name || invoice.createdBy?.email || "BBTech Billing Team";
  const termsText = invoice.termsAndConditions || "This amount is not refundable. You can get it as a service from Bit Byte Technologies.";
  const detailCell = (label, value, options = {}) => ({
    stack: [
      { text: label, style: "label" },
      { text: value || "-", style: "value" },
    ],
    fillColor: options.fillColor,
    margin: options.margin || [0, 0, 0, 0],
  });
  const summaryRow = (label, value, options = {}) => [
    { text: label, bold: options.bold || false, color: options.color || "#475569", margin: [0, 4, 0, 4] },
    {
      text: `Rs ${formatMoney(value)}`,
      alignment: "right",
      bold: options.bold || false,
      color: options.color || "#0f172a",
      margin: [0, 4, 0, 4],
    },
  ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 56],
    content: [
      {
        table: {
          widths: ["*"],
          body: [[
            {
              stack: [
                {
                  columns: [
                    { width: "*", text: "" },
                    ...(companyLogo ? [{ image: companyLogo, width: 50, margin: [0, 2, 12, 0] }] : []),
                    {
                      width: "auto",
                      stack: [
                        { text: COMPANY.name, bold: true, fontSize: 18, color: "#ffffff" },
                        { text: COMPANY.office, fontSize: 9, color: "#93c5fd", margin: [0, 3, 0, 2] },
                        ...COMPANY.address.map((line) => ({ text: line, fontSize: 8.3, color: "#cbd5e1" })),
                        ...(COMPANY.gstin ? [{ text: `GSTIN: ${COMPANY.gstin}`, fontSize: 8.3, color: "#cbd5e1" }] : []),
                      ],
                    },
                    { width: "*", text: "" },
                  ],
                  columnGap: 0,
                },
              ],
              fillColor: "#07111f",
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 18,
          paddingRight: () => 18,
          paddingTop: () => 18,
          paddingBottom: () => 18,
        },
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              { text: "Intern Details", style: "sectionTitle", colSpan: 2, fillColor: "#f8fafc", margin: [0, 0, 0, 0] },
              {},
              { text: "Invoice & Payment Details", style: "sectionTitle", colSpan: 2, fillColor: "#f8fafc", margin: [0, 0, 0, 0] },
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
              detailCell("COLLEGE", invoice.collegeName),
              detailCell("PAYMENT ID", invoice.paymentId),
              detailCell("PAYMENT STATUS", paymentStatus),
            ],
            [
              detailCell("DEPARTMENT", invoice.courseMajor),
              detailCell("PASSED OUT", invoice.passedOut),
              detailCell("GENERATED BY", generatedBy),
              detailCell("PHONE", invoice.phone),
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#cbd5e1",
          vLineColor: () => "#cbd5e1",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 14],
      },
      {
        table: {
          widths: ["*"],
          body: [[
            {
              stack: [
                { text: "ADDRESS OF INTERN", style: "label" },
                { text: invoice.address || "-", style: "value", margin: [0, 3, 0, 0] },
              ],
              fillColor: "#f8fafc",
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#dbeafe",
          vLineColor: () => "#dbeafe",
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 10,
          paddingBottom: () => 10,
        },
        margin: [0, 0, 0, 16],
      },
      {
        margin: [0, 0, 0, 18],
        table: {
          headerRows: 1,
          widths: [36, "*", 92, 88],
          body: [
            [
              { text: "S.No", style: "tableHeader", alignment: "center" },
              { text: "Description", style: "tableHeader" },
              { text: "Duration in Days", style: "tableHeader", alignment: "center" },
              { text: "Amount (Rs)", style: "tableHeader", alignment: "right" },
            ],
            [
              { text: "1", alignment: "center", margin: [0, 8, 0, 8] },
              {
                text: [
                  { text: invoice.position || "Internship Service", bold: true },
                  { text: "\nProfessional internship program fee", color: "#64748b", fontSize: 7.5 },
                ],
                margin: [0, 8, 0, 8],
              },
              { text: invoice.duration || "-", alignment: "center", margin: [0, 8, 0, 8] },
              { text: formatMoney(amount), alignment: "right", bold: true, margin: [0, 8, 0, 8] },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? "#07111f" : rowIndex % 2 === 0 ? "#f8fafc" : null),
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#cbd5e1",
          vLineColor: () => "#cbd5e1",
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Terms & Conditions", style: "boxTitle" },
              { text: termsText, margin: [0, 8, 0, 0], lineHeight: 1.25 },
              { text: "This is a computer-generated invoice.", margin: [0, 8, 0, 0], color: "#64748b" },
            ],
            margin: [14, 12, 14, 12],
          },
          {
            width: 180,
            stack: [
              { text: "Invoice Summary", style: "boxTitle" },
              {
                table: {
                  widths: ["*", 88],
                  body: [
                    summaryRow("Service Amount", amount),
                    summaryRow("Amount Paid", invoice.paymentReceived ? amount : 0, { bold: true }),
                    summaryRow("Balance", invoice.paymentReceived ? 0 : amount, { bold: true, color: invoice.paymentReceived ? "#15803d" : "#b45309" }),
                  ],
                },
                layout: "noBorders",
                margin: [0, 8, 0, 0],
              },
            ],
            margin: [14, 12, 14, 12],
          },
        ],
        columnGap: 14,
        fontSize: 8.5,
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          widths: ["*"],
          body: [[
            {
              stack: [
                { text: "\n\n", margin: [0, 0, 0, 2] },
                { canvas: [{ type: "line", x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.7, lineColor: "#0f172a" }], alignment: "right" },
                { text: "Authorized sign", alignment: "right", fontSize: 9.5, bold: true, color: "#0f172a", margin: [0, 6, 0, 0] },
                { text: COMPANY.name, alignment: "right", fontSize: 8, color: "#64748b" },
              ],
              margin: [14, 18, 14, 18],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
        },
        margin: [0, 0, 0, 18],
      },
      {
        table: {
          widths: ["*"],
          body: [[
            {
              stack: [
                { text: "Thank you", fontSize: 16, bold: true, color: "#0f172a" },
                { text: "for choosing Bit Byte Technologies.", fontSize: 8.5, color: "#64748b", margin: [0, 4, 0, 18] },
                { text: "For BBTech,", fontSize: 9, color: "#0f172a" },
              ],
              margin: [14, 14, 14, 14],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
        },
        margin: [0, 0, 0, 0],
      },
    ],
    footer: (currentPage, pageCount) => ({
      margin: [36, 0, 36, 22],
      stack: [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 0.6, lineColor: "#e2e8f0" }] },
        {
          columns: [
            {
              text: "Intern invoice generated by Bit Byte Technologies billing system.",
              fontSize: 7.5,
              color: "#64748b",
              margin: [0, 10, 0, 0],
            },
            {
              text: `Generated on ${formatDateTime(invoice.createdAt || new Date())}`,
              alignment: "right",
              fontSize: 7.5,
              color: "#64748b",
              margin: [0, 10, 0, 0],
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
        color: "#64748b",
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
        color: "#ffffff",
      },
      boxTitle: {
        fontSize: 9,
        bold: true,
        color: "#0f172a",
      },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: "#0f172a",
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
