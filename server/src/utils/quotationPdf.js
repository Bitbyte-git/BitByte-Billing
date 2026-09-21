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
    columns: [
      {
        width: 102,
        stack: [
          companyLogo
            ? { image: companyLogo, width: 90, alignment: "center" }
            : {
                text: "BitByte",
                alignment: "center",
                bold: true,
                color: COLORS.blue,
                fontSize: 16,
              },
          {
            text: "WE ENGINEER LIFE'S LANGUAGE",
            alignment: "center",
            fontSize: 4.4,
            color: "#64748B",
            characterSpacing: 0.28,
            margin: [0, 3, 0, 0],
          },
        ],
        margin: [0, 4, 4, 0],
      },
      {
        width: "*",
        stack: [
          {
            text: [
              { text: "Bit Byte", color: COLORS.blue },
              { text: " Technologies", color: COLORS.green },
            ],
            bold: true,
            fontSize: 21,
            margin: [0, 8, 0, 4],
          },
          {
            text: `${COMPANY.office}, ${COMPANY.address[0]}`,
            fontSize: 9.2,
            bold: true,
            color: COLORS.navy,
          },
          {
            text: `${COMPANY.address[1]}, ${COMPANY.address[2]}`,
            fontSize: 9.2,
            bold: true,
            color: COLORS.navy,
            margin: [0, 1, 0, 5],
          },
          {
            text: [
              { text: `GST NO : ${COMPANY.gstin}` },
              { text: "   |   ", color: "#94A3B8" },
              { text: `MSME : ${COMPANY.udyamId}` },
            ],
            fontSize: 8.2,
            bold: true,
            color: COLORS.navy,
          },
        ],
        margin: [0, 2, 0, 0],
      },
      { width: rightGutter, text: "" },
    ],
    columnGap: 6,
    margin: [0, 0, 0, 8],
  };
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

function normalizeAbsoluteUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "https://bit-byte-billing-client.vercel.app";
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function publicQuotationUrl(quotation) {
  const baseUrl = normalizeAbsoluteUrl(process.env.CLIENT_URL || process.env.APP_URL);
  const publicId = quotation._id || quotation.id || quotation.quotationId;
  return `${baseUrl}/client/quotations/${encodeURIComponent(String(publicId || ""))}`;
}

export function createQuotationPdfDocument(quotation) {
  const fonts = {
    Roboto: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };
  const printer = new PdfPrinter(fonts);

  // Resolve client data
  const client = quotation.clientId || {};
  const clientName = client.companyName || client.fullName || "Client";
  const clientEmail = client.email || "-";
  const clientPhone = client.phone || "-";
  const companyName = client.companyName || clientName;
  const clientIdStr = client.clientId || (client._id ? String(client._id).slice(-8).toUpperCase() : "-");

  // Resolve quotation meta
  const quotationIdStr = quotation.quotationId || "-";
  const quotationDate = formatDate(quotation.submittedAt || quotation.createdAt || new Date());
  const validUntil = formatDate(
    quotation.validUntil ||
      new Date((quotation.submittedAt || quotation.createdAt || Date.now()).valueOf
        ? new Date(quotation.submittedAt || quotation.createdAt || Date.now()).getTime() + 15 * 86400000
        : Date.now() + 15 * 86400000)
  );
  const generatedBy =
    quotation.createdByName ||
    quotation.createdBy?.name ||
    quotation.createdBy?.email ||
    "BBTech Admin Team";
  const billingType = "Client Billing";

  // Build line items from costingItems
  const rawItems = (quotation.costingItems && quotation.costingItems.length > 0)
    ? quotation.costingItems
    : [];

  const items = rawItems.map((item) => {
    const serviceName = item.subService || item.subServiceName || item.service || "Service";
    const quantity = Number(item.quantity || 1);
    const taxableValue = Number(item.taxableValue ?? (item.basePrice * quantity - (item.discountAmount || 0)));
    const gstPct = Number(item.gstPercentage || 18);
    const gstTotal = Number(item.gstAmount ?? (taxableValue * gstPct / 100));
    const cgstAmt = gstTotal / 2;
    const sgstAmt = gstTotal / 2;
    const igstAmt = 0;
    const total = Number(item.totalAmount ?? (taxableValue + gstTotal));
    return {
      service: serviceName,
      description: item.description || "",
      sacCode: item.sacCode || getSacCode(serviceName) || "-",
      quantity,
      taxableValue,
      cgstAmount: cgstAmt,
      sgstAmount: sgstAmt,
      igstAmount: igstAmt,
      total,
    };
  });

  const totals = items.reduce(
    (acc, item) => ({
      taxable: acc.taxable + item.taxableValue,
      cgst: acc.cgst + item.cgstAmount,
      sgst: acc.sgst + item.sgstAmount,
      igst: acc.igst + item.igstAmount,
      total: acc.total + item.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  const quotationTotal = Number(
    quotation.totalAmount ?? quotation.finalTotal ?? totals.total ?? 0
  );
  const publicUrl = publicQuotationUrl(quotation);

  // ---- Reuse exact same layout helpers ----
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

  // Line item rows — same as invoice format
  const itemRows = items.length
    ? items.map((item, index) => [
        { text: String(index + 1), alignment: "center", margin: [0, 8, 0, 8] },
        {
          text: [
            { text: item.service || "Service", bold: true },
            item.description
              ? { text: `\n${item.description}`, color: COLORS.muted, fontSize: 7.2 }
              : { text: "" },
          ],
          margin: [0, 8, 0, 8],
        },
        { text: item.sacCode || "-", alignment: "center", margin: [0, 8, 0, 8] },
        { text: String(item.quantity || 1), alignment: "center", margin: [0, 8, 0, 8] },
        { text: formatMoney(item.taxableValue), alignment: "right", margin: [0, 8, 0, 8] },
        { text: formatMoney(item.cgstAmount), alignment: "right", margin: [0, 8, 0, 8] },
        { text: formatMoney(item.sgstAmount), alignment: "right", margin: [0, 8, 0, 8] },
        { text: formatMoney(item.igstAmount), alignment: "right", margin: [0, 8, 0, 8] },
        { text: formatMoney(item.total), alignment: "right", bold: true, margin: [0, 8, 0, 8] },
      ])
    : [
        [
          {
            text: "No quotation line items available.",
            colSpan: 9,
            alignment: "center",
            color: COLORS.muted,
            margin: [0, 14, 0, 14],
          },
          {}, {}, {}, {}, {}, {}, {}, {},
        ],
      ];

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [24, 18, 24, 42],
    background: invoiceHeaderBackground(),
    content: [
      invoiceHeaderBlock(HEADER_BANNER.width - 24),

      // ── Two-column detail header: CLIENT DETAILS | QUOTATION & PAYMENT DETAILS ──
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
                detailCell("QUOTATION", quotationIdStr),
              ],
              [
                detailCell("COMPANY", companyName),
                detailCell("CLIENT ID", clientIdStr),
              ],
            ]),
          },
          {
            width: "*",
            ...sectionTable("QUOTATION & VALIDITY DETAILS", [
              [
                detailCell("QUOTATION DT", quotationDate),
                detailCell("QUOTATION ID", quotationIdStr),
              ],
              [
                detailCell("VALID UNTIL", validUntil),
                detailCell("STATUS", quotation.status || "Approved"),
              ],
              [
                detailCell("GENERATED BY", generatedBy),
                detailCell("BILLING TYPE", billingType),
              ],
            ]),
          },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 10],
      },

      // ── Payment Details table — exactly same as invoice ──
      {
        margin: [0, 0, 0, 10],
        table: {
          headerRows: 2,
          widths: [24, "*", 38, 24, 56, 48, 48, 48, 58],
          body: [
            [
              {
                text: "PAYMENT DETAILS",
                style: "sectionTitle",
                alignment: "center",
                colSpan: 9,
                fillColor: "#FFFFFF",
              },
              {}, {}, {}, {}, {}, {}, {}, {},
            ],
            [
              { text: "S.No", style: "tableHeader", alignment: "center" },
              { text: "Description", style: "tableHeader" },
              { text: "SAC", style: "tableHeader", alignment: "center" },
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

      // ── Terms & Quotation Summary (page break before — same as invoice) ──
      {
        pageBreak: "before",
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                stack: [
                  { text: "TERMS & CONDITIONS", style: "sectionTitle" },
                  {
                    text: "This quotation is valid for 15 days from the date of issue.",
                    margin: [0, 9, 0, 0],
                    lineHeight: 1.25,
                  },
                  {
                    text: "Prices are subject to change after the validity period.",
                    margin: [0, 6, 0, 0],
                    lineHeight: 1.25,
                  },
                  {
                    text: "GST @18% is applicable on all services as per government norms.",
                    margin: [0, 6, 0, 0],
                    lineHeight: 1.25,
                  },
                  {
                    text: "Please mention the quotation number for all communications.",
                    margin: [0, 6, 0, 0],
                    lineHeight: 1.25,
                  },
                  {
                    text: "This is a computer-generated quotation.",
                    margin: [0, 8, 0, 0],
                    color: COLORS.muted,
                  },
                ],
                margin: [10, 10, 10, 10],
              },
              {
                stack: [
                  { text: "QUOTATION SUMMARY", style: "sectionTitle" },
                  {
                    table: {
                      widths: ["*", 96],
                      body: [
                        moneyRow("Taxable Amount", totals.taxable),
                        moneyRow("CGST Total", totals.cgst),
                        moneyRow("SGST Total", totals.sgst),
                        moneyRow("IGST Total", totals.igst),
                        moneyRow("Quotation Total", quotationTotal, { bold: true }),
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
        fontSize: 8.3,
        margin: [0, 285, 0, 12],
      },

      // ── Authorized Signatory block ──
      {
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    text: "AUTHORIZED SIGNATORY",
                    style: "sectionTitle",
                    margin: [0, 0, 0, 34],
                  },
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
                margin: [14, 10, 14, 14],
              },
            ],
          ],
        },
        layout: cardLayout,
        margin: [0, 0, 0, 12],
      },

      // ── Thank you + QR verification ──
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
                margin: [14, 9, 14, 9],
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
                    text: "Scan to verify quotation details",
                    alignment: "center",
                    fontSize: 7.5,
                    bold: true,
                    color: COLORS.navy,
                    margin: [0, 0, 0, 6],
                  },
                  { svg: qrSvg(publicUrl), width: 56, alignment: "center" },
                ],
                margin: [8, 6, 8, 6],
              },
            ],
          ],
        },
        layout: cardLayout,
      },
    ],

    // ── Footer — identical to invoice footer ──
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
              text: "Client quotation generated by Bit Byte Technologies billing system.",
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
              text: `Generated on ${formatDateTime(quotation.createdAt || new Date())}`,
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

export function quotationPdfBuffer(quotation) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = createQuotationPdfDocument(quotation);
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
