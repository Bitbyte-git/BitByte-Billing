import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PdfPrinter from 'pdfmake';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_CANDIDATES = [
  path.resolve(__dirname, '../../../client/src/assets/logo-invoice.png'),
  path.resolve(__dirname, '../../../client/src/assets/logo.png'),
];
const LOGO_PATH = LOGO_CANDIDATES.find((p) => fs.existsSync(p));

function numberToIndianWords(num) {
  num = Math.round(Number(num || 0));
  if (num === 0) return 'Zero';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return a[n];
    const tens = b[Math.floor(n / 10)];
    const ones = a[n % 10];
    return tens + (ones ? ' ' + ones : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += a[hundred] + ' Hundred';
    if (rest > 0) {
      res += (hundred > 0 ? ' and ' : '') + convertTwoDigits(rest);
    }
    return res;
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const rest = num;

  if (crore > 0) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (rest > 0) words += convertThreeDigits(rest);

  return 'Rupees ' + words.trim() + ' Only';
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatSalutationName(client) {
  if (!client) return 'Client';
  const rawName = (client.fullName || client.name || client.clientName || client.companyName || 'Client').trim();
  if (!client.salutation) return rawName;
  const sal = client.salutation.trim();
  const prefix = sal.endsWith('.') ? sal : `${sal}.`;
  return `${prefix} ${rawName}`;
}

function formatPhone(client) {
  const raw = String(client?.phone || '').trim();
  if (!raw || raw === '-') return '-';
  if (raw.startsWith('+')) return raw;
  const code = client?.countryCode ? (String(client.countryCode).startsWith('+') ? client.countryCode : `+${client.countryCode}`) : '+91';
  return `${code} ${raw}`;
}

export function createLegacyQuotationPdfDocument(quotation) {
  const fonts = {
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    },
    Times: {
      normal: 'Times-Roman',
      bold: 'Times-Bold',
      italics: 'Times-Italic',
      bolditalics: 'Times-BoldItalic'
    }
  };
  const printer = new PdfPrinter(fonts);

  const clientObj = (quotation.clientId && typeof quotation.clientId === 'object') ? quotation.clientId : {};
  const clientDetails = (quotation.clientDetails && typeof quotation.clientDetails === 'object') ? quotation.clientDetails : {};
  const client = { ...clientDetails, ...clientObj };

  const clientName = formatSalutationName(client);
  const companyName = client.companyName || clientDetails.companyName || clientObj.companyName || clientName;
  const clientPhone = formatPhone(client);
  const quotationIdStr = quotation.quotationId || '-';
  const quotationDate = formatDate(quotation.submittedAt || quotation.createdAt || new Date());
  const projectTitle = quotation.projectTitle || 'Project Quotation';
  const techStack = quotation.techStack || quotation.technologyPreference || 'Flutter & Kotlin | AWS Cloud Server.';

  const rawGstin = String(
    client.gstin ||
    clientObj.gstin ||
    clientDetails.gstin ||
    quotation.gstin ||
    quotation.clientGstin ||
    client.gstNo ||
    clientObj.gstNo ||
    ''
  ).trim();
  const clientGstin = (rawGstin && rawGstin !== '-' && rawGstin.toUpperCase() !== 'NA' && rawGstin.toUpperCase() !== 'N/A' && rawGstin.toUpperCase() !== 'NONE')
    ? rawGstin.toUpperCase()
    : null;

  let contactPersonStr = '';
  if (Array.isArray(quotation.contactPersons)) {
    contactPersonStr = quotation.contactPersons
      .map((cp) => {
        if (!cp) return '';
        if (typeof cp === 'string') return cp.trim();
        return [cp.name, cp.designation, cp.phone].filter(Boolean).join(' - ');
      })
      .filter(Boolean)
      .join('\n');
  } else if (typeof quotation.contactPersons === 'string') {
    contactPersonStr = quotation.contactPersons.trim();
  } else if (client.contactPerson) {
    contactPersonStr = String(client.contactPerson).trim();
  }

  // Line items
  const rawItems = (quotation.costingItems && quotation.costingItems.length > 0)
    ? quotation.costingItems
    : (quotation.items && quotation.items.length > 0
      ? quotation.items
      : (quotation.quotationItems && quotation.quotationItems.length > 0
        ? quotation.quotationItems
        : []));

  const items = rawItems.map((item, index) => {
    const isComplimentary = Boolean(
      item.isComplimentary ||
      item.tier === 'Complimentary' ||
      item.tierKey === 'complimentary' ||
      (item.description && /complimentary|free\s+of\s+charge/i.test(item.description))
    );
    const isOptional = Boolean(item.isOptional || item.optional || item.isOptionalSuggestion);
    const serviceName = item.subService || item.subServiceName || item.serviceName || item.mainService || `Service ${index + 1}`;
    const description = item.description || item.serviceRequirement || '';
    const timeline = item.timeline || (item.frequency === 'Monthly' ? 'Monthly' : 'One-Time');
    const frequency = item.frequency || item.payable || 'One-Time';
    // Cost always displays the actual service value in the table
    const rawBp = Number(item.basePrice || 0);
    const rawTax = Number(item.taxableValue || 0);
    let cost = rawBp > 0 ? rawBp : (rawTax > 0 ? rawTax : 0);
    if (cost === 0 && isComplimentary) {
      const name = String(serviceName).toLowerCase();
      if (name.includes('erp') || name.includes('crm') || name.includes('hrms')) cost = 39990;
      else if (name.includes('whatsapp')) cost = 9990;
    }
    return {
      sNo: index + 1,
      serviceName,
      description,
      timeline,
      frequency,
      cost,
      isComplimentary,
      isOptional
    };
  });

  // totalCost excludes complimentary and optional items from the total payment
  const totalCost = items
    .filter((i) => !i.isComplimentary && !i.isOptional)
    .reduce((acc, i) => acc + i.cost, 0);

  // Logo base64
  let logoBase64 = null;
  if (LOGO_PATH && fs.existsSync(LOGO_PATH)) {
    try {
      logoBase64 = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
    } catch (e) {
      console.warn('Could not read logo image:', e.message);
    }
  }

  // Payment Terms
  const defaultPaymentTerms = quotation.paymentTerms || `70% Advance\n15% Development Stages on every Milestones\n15% Final Delivery`;
  const paymentLines = defaultPaymentTerms.split('\n').filter(Boolean);

  const deliveryTimeline = quotation.deliveryTimeline || 'Every Week based on the requirements finalization and non-interference of requirements during the development phase.';

  const isSingleItem = items.length <= 2;

  // Proportional padding based on whether contact persons are present
  const hasExtraContactRows = Boolean(contactPersonStr && contactPersonStr.includes('\n'));
  const tableVerticalPad = hasExtraContactRows ? 6 : 7;
  const sectionGap = hasExtraContactRows ? 11 : 13;

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [36, 26, 36, 62],
    background: function () {
      if (!logoBase64) return null;
      return {
        image: logoBase64,
        width: 250,
        opacity: 0.045,
        alignment: 'center',
        margin: [0, 270, 0, 0]
      };
    },
    footer: function (currentPage, pageCount) {
      return {
        margin: [36, 0, 36, 8],
        stack: [
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 523,
                h: 2.5,
                linearGradient: ['#00B4D8', '#00E599']
              }
            ],
            margin: [0, 0, 0, 4]
          },
          {
            text: '2nd Floor - West Wing, Raja Complex, Opp: Sago Serve, Omalur main road, Salem-636302, TN-India.',
            font: 'Times',
            fontSize: 8.5,
            alignment: 'center',
            color: '#000000',
            margin: [0, 0, 0, 2.5]
          },
          {
            columns: [
              {
                text: 'reachus@bitbytetech.org',
                font: 'Times',
                fontSize: 8.5,
                color: '#0000FF',
                decoration: 'underline',
                link: 'mailto:reachus@bitbytetech.org',
                alignment: 'left'
              },
              {
                text: 'www.bitbytetech.org',
                font: 'Times',
                fontSize: 8.5,
                color: '#0000FF',
                decoration: 'underline',
                link: 'https://www.bitbytetech.org',
                alignment: 'center'
              },
              {
                text: '+91 99437 43136 \u2013 WhatsApp Only.',
                font: 'Times',
                fontSize: 8.5,
                color: '#000000',
                alignment: 'right'
              }
            ],
            margin: [15, 0, 15, 2]
          },
          {
            columns: [
              {
                text: 'Internal Document',
                font: 'Times',
                fontSize: 8.5,
                color: '#B5B5B5',
                alignment: 'left'
              },
              {
                text: 'Confidential',
                font: 'Times',
                fontSize: 8.5,
                color: '#B5B5B5',
                alignment: 'center'
              },
              {
                text: 'All rights reserved.',
                font: 'Times',
                fontSize: 8.5,
                color: '#B5B5B5',
                alignment: 'right'
              }
            ],
            margin: [15, 0, 15, 2]
          },
          {
            text: [
              { text: 'Page ' },
              { text: `${currentPage} of ${pageCount}`, bold: true }
            ],
            font: 'Times',
            fontSize: 9,
            alignment: 'right',
            color: '#000000',
            margin: [0, 0, 15, 0]
          }
        ]
      };
    },
    content: [
      // ══════════════════════════════════════════════════════════════
      // PAGE 1: Proposal Details & Commercial Summary
      // (Fills the complete first page right down to the footer)
      // ══════════════════════════════════════════════════════════════

      // Top Row: Logo at top-right corner
      {
        columns: [
          { text: '', width: '*' },
          logoBase64
            ? { image: logoBase64, width: 78, alignment: 'right' }
            : { text: '' }
        ],
        margin: [0, 0, 0, 8]
      },

      // Centered Title safely below the logo
      {
        text: `${clientName} Project Quotation`,
        bold: true,
        fontSize: 13.5,
        alignment: 'center',
        decoration: 'underline',
        color: '#000000',
        margin: [0, 0, 0, 12]
      },

      // Meta: Quotation No & Dated
      {
        columns: [
          {
            text: [
              { text: 'Quotation No: ', bold: true, color: '#1F4E79', fontSize: 9.8 },
              { text: `${quotationIdStr.endsWith('.') ? quotationIdStr : `${quotationIdStr}.`}`, bold: true, color: '#1F4E79', decoration: 'underline', fontSize: 9.8 }
            ]
          },
          {
            text: `Dated: ${quotationDate.endsWith('.') ? quotationDate : `${quotationDate}.`}`,
            bold: true,
            fontSize: 9.8,
            alignment: 'right',
            color: '#000000'
          }
        ],
        margin: [0, 0, 0, sectionGap]
      },

      // Project & Tech Stack Box
      {
        table: {
          widths: [145, '*'],
          body: [
            [
              { text: 'Name of the Project:', bold: true, color: '#1F4E79', fontSize: 9.2 },
              { text: projectTitle, fontSize: 9.2, color: '#000000' }
            ],
            [
              { text: 'Tech Stack:', bold: true, color: '#1F4E79', fontSize: 9.2 },
              { text: techStack, fontSize: 9.2, color: '#000000' }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => tableVerticalPad,
          paddingBottom: () => tableVerticalPad
        },
        margin: [0, 0, 0, sectionGap]
      },

      // Company Details Section
      {
        text: 'Company Details',
        bold: true,
        fontSize: 11,
        color: '#1F4E79',
        margin: [0, 3, 0, 5]
      },
      {
        table: {
          widths: [145, '*'],
          body: [
            [
              { text: 'Company Name:', bold: true, fontSize: 9.2 },
              { text: 'Bit Byte Technologies, Salem.', bold: true, fontSize: 9.2, color: '#000000' }
            ],
            [
              { text: 'Address:', bold: true, fontSize: 9.2 },
              { text: '2nd Floor - West Wing, Raja Complex, Opp. to: Sago Serve, Omalur main road,\nSalem, TN - 636302', fontSize: 9.2, color: '#000000' }
            ],
            [
              { text: 'Contact Number:', bold: true, fontSize: 9.2 },
              { text: '+91 99437 43136 (WhatsApp Only)', fontSize: 9.2, color: '#000000' }
            ],
            ...(contactPersonStr ? [
              [
                { text: 'Contact Person:', bold: true, fontSize: 9.2 },
                { text: contactPersonStr, fontSize: 9.2, color: '#000000' }
              ]
            ] : []),
            [
              { text: 'E-Mail:', bold: true, fontSize: 9.2 },
              { text: 'reachus@bitbytetech.org', fontSize: 9.2, color: '#0056B3', decoration: 'underline' }
            ],
            [
              { text: 'Website:', bold: true, fontSize: 9.2 },
              { text: 'www.bitbytetech.org', fontSize: 9.2, color: '#0056B3', decoration: 'underline' }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => tableVerticalPad,
          paddingBottom: () => tableVerticalPad
        },
        margin: [0, 0, 0, sectionGap]
      },

      // Client Information Section
      {
        text: 'Client Information',
        bold: true,
        fontSize: 11,
        color: '#1F4E79',
        margin: [0, 3, 0, 5]
      },
      {
        table: {
          widths: [145, '*'],
          body: [
            [
              { text: 'Client Name:', bold: true, fontSize: 9.2 },
              { text: `${clientName}.`, bold: true, fontSize: 9.2, color: '#000000' }
            ],
            [
              { text: 'Contact No:', bold: true, fontSize: 9.2 },
              { text: clientPhone, fontSize: 9.2, color: '#000000' }
            ],
            [
              { text: 'Company Name:', bold: true, fontSize: 9.2 },
              { text: `${companyName}.`, fontSize: 9.2, color: '#000000' }
            ],
            ...(clientGstin ? [
              [
                { text: 'GST.No:', bold: true, fontSize: 9.2 },
                { text: clientGstin, fontSize: 9.2, color: '#000000' }
              ]
            ] : []),
            [
              { text: 'Project Name:', bold: true, fontSize: 9.2 },
              { text: projectTitle, fontSize: 9.2, color: '#000000' }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => tableVerticalPad,
          paddingBottom: () => tableVerticalPad
        },
        margin: [0, 0, 0, sectionGap + 2]
      },

      // Commercial Summary Section (Generously distributed to fill Page 1)
      {
        text: 'Commercial Summary',
        bold: true,
        fontSize: 11.5,
        color: '#1F4E79',
        margin: [0, 3, 0, 7]
      },
      {
        text: [
          { text: 'Estimated Total Cost: ', bold: true, fontSize: 9.8, color: '#000000' },
          { text: `Rs. ${totalCost.toLocaleString('en-IN')}/- `, bold: true, fontSize: 10.2, color: '#000000' },
          { text: `(INR: ${numberToIndianWords(totalCost)}) `, fontSize: 9.4, color: '#2D3748' },
          { text: '+ GST @18% + Applicable Taxes& (If any).', fontSize: 9.4, color: '#2D3748' }
        ],
        margin: [20, 0, 0, 9],
        lineHeight: 1.35
      },
      {
        text: 'A. Payment Terms:',
        bold: true,
        fontSize: 9.5,
        color: '#1F4E79',
        margin: [20, 4, 0, 4]
      },
      ...paymentLines.map((line) => {
        const cleanLine = line.trim().replace(/^[-•*]\s*/, '');
        return {
          text: cleanLine,
          fontSize: 9.4,
          margin: [45, 3, 0, 3]
        };
      }),
      {
        text: [
          { text: 'B. Estimated Delivery Timeline: ', bold: true, fontSize: 9.5, color: '#1F4E79' },
          { text: deliveryTimeline, fontSize: 9.4, color: '#2D3748' }
        ],
        margin: [20, 7, 0, 5],
        lineHeight: 1.35
      },
      {
        text: [
          { text: 'C. Negotiation terms: ', bold: true, fontSize: 9.5, color: '#1F4E79' },
          { text: 'Open for Negotiation on Mutual Terms.', fontSize: 9.4, color: '#2D3748' }
        ],
        margin: [20, 4, 0, 5]
      },
      {
        text: [
          { text: 'D. Monthly Charges are due on or before 5th date of every month on single payment.', bold: true, fontSize: 9.5, color: '#1F4E79' }
        ],
        margin: [20, 4, 0, 5]
      },
      {
        text: [
          { text: 'E. Proposal Validity: ', bold: true, fontSize: 9.5, color: '#1F4E79' },
          { text: 'This commercial proposal is valid for 30 calendar days from the date of issuance.', fontSize: 9.4, color: '#2D3748' }
        ],
        margin: [20, 4, 0, 5]
      },
      {
        text: [
          { text: 'F. Change Request & Additional Scope: ', bold: true, fontSize: 9.5, color: '#1F4E79' },
          { text: 'Any changes or modifications outside the finalized PRD will be estimated separately upon mutual written confirmation.', fontSize: 9.4, color: '#2D3748' }
        ],
        margin: [20, 4, 0, 0],
        lineHeight: 1.3
      },

      // ══════════════════════════════════════════════════════════════
      // PAGE 2: Services Breakdown Table & Commercial Execution
      // (Starts strictly on Page 2 as requested)
      // ══════════════════════════════════════════════════════════════
      {
        text: '',
        pageBreak: 'after'
      },
      // Top Row: Logo at top-right corner on Page 2
      {
        columns: [
          { text: '', width: '*' },
          logoBase64
            ? { image: logoBase64, width: 78, alignment: 'right' }
            : { text: '' }
        ],
        margin: [0, 0, 0, 8]
      },
      {
        text: 'Services Breakdown',
        bold: true,
        fontSize: 11.5,
        color: '#1F4E79',
        margin: [0, 0, 0, 8]
      },
      {
        table: {
          widths: [28, 120, '*', 65, 65, 62],
          headerRows: 2,
          body: [
            // Row 1: Green Banner spanning all columns
            [
              {
                text: `Services Breakdown for ${clientName}.`,
                colSpan: 6,
                bold: true,
                fontSize: 9.5,
                color: '#FFFFFF',
                fillColor: '#009944',
                alignment: 'center',
                margin: [0, 4.5, 0, 4.5]
              },
              {}, {}, {}, {}, {}
            ],
            // Row 2: Yellow Header Columns
            [
              { text: 'S.No', bold: true, fontSize: 9, alignment: 'center', fillColor: '#FFF200', margin: [0, 3.5, 0, 3.5] },
              { text: 'Service', bold: true, fontSize: 9, alignment: 'center', fillColor: '#FFF200', margin: [0, 3.5, 0, 3.5] },
              { text: 'Description of services', bold: true, fontSize: 9, alignment: 'center', fillColor: '#FFF200', margin: [0, 3.5, 0, 3.5] },
              { text: 'Timeline', bold: true, fontSize: 9, alignment: 'center', fillColor: '#FFF200', margin: [0, 3.5, 0, 3.5] },
              { text: 'Frequency', bold: true, fontSize: 9, alignment: 'center', fillColor: '#FFF200', margin: [0, 3.5, 0, 3.5] },
              { text: 'Cost', bold: true, fontSize: 9, alignment: 'center', fillColor: '#FFF200', margin: [0, 3.5, 0, 3.5] }
            ],
            // Data Rows
            ...items.map((item) => [
              { text: String(item.sNo), fontSize: 8.8, alignment: 'center' },
              { text: item.serviceName, bold: true, fontSize: 8.8, color: '#000000' },
              { text: item.description || '-', fontSize: 8.4, lineHeight: 1.3, color: '#1A202C' },
              { text: item.timeline, fontSize: 8.8, alignment: 'center', color: '#1A202C' },
              { text: item.frequency, fontSize: 8.8, alignment: 'center', color: '#1A202C' },
              item.isComplimentary
                ? {
                    text: [
                      { text: item.cost.toLocaleString('en-IN') + '\n', bold: true, fontSize: 8.8 },
                      { text: '[Complimentary]', color: '#009944', fontSize: 7.2, bold: true }
                    ],
                    alignment: 'right'
                  }
                : { text: item.cost.toLocaleString('en-IN'), fontSize: 9, bold: true, alignment: 'right' }
            ]),
            // Total Row
            [
              {
                text: 'TOTAL',
                colSpan: 5,
                bold: true,
                fontSize: 9.5,
                alignment: 'right',
                fillColor: '#F8FAFC'
              },
              {}, {}, {}, {},
              {
                text: totalCost.toLocaleString('en-IN'),
                bold: true,
                fontSize: 9.8,
                alignment: 'right',
                fillColor: '#F8FAFC'
              }
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0.6,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => (isSingleItem ? 8 : 5),
          paddingBottom: () => (isSingleItem ? 8 : 5)
        },
        margin: [0, 0, 0, 14]
      },

      // Post-table Notes
      {
        text: '• Further Elaborate PRD documentation on acceptance of Quotation Proposal in further rounds of Talks.',
        fontSize: 9,
        bold: true,
        color: '#1F4E79',
        margin: [0, 6, 0, 4]
      },
      {
        text: '• Applicable Taxes&. = GST@18%, TDS/TCS, others – if applicable.',
        fontSize: 8.6,
        color: '#2D3748',
        margin: [0, 0, 0, 16]
      },

      // When items are few (1-2 services), include Execution Terms & Dual Authorization Sign-off to balance Page 2
      ...(isSingleItem ? [
        {
          text: 'Project Terms & Execution Guidelines',
          bold: true,
          fontSize: 10,
          color: '#1F4E79',
          margin: [0, 4, 0, 6]
        },
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    {
                      text: [
                        { text: '1. Quality Assurance & Support: ', bold: true, color: '#1F4E79', fontSize: 8.5 },
                        { text: 'Deliverables undergo standard QA testing before staging. 30 days of complimentary bug-fixing and support are included post-deployment.', color: '#2D3748', fontSize: 8.5 }
                      ],
                      margin: [0, 2, 0, 4],
                      lineHeight: 1.25
                    },
                    {
                      text: [
                        { text: '2. Client Approvals: ', bold: true, color: '#1F4E79', fontSize: 8.5 },
                        { text: 'Required design assets and milestone reviews are to be provided in a timely manner to maintain the delivery schedule.', color: '#2D3748', fontSize: 8.5 }
                      ],
                      margin: [0, 2, 0, 4],
                      lineHeight: 1.25
                    },
                    {
                      text: [
                        { text: '3. Intellectual Property Rights: ', bold: true, color: '#1F4E79', fontSize: 8.5 },
                        { text: 'Upon full commercial settlement, complete rights and deployment assets are assigned to the client.', color: '#2D3748', fontSize: 8.5 }
                      ],
                      margin: [0, 2, 0, 2],
                      lineHeight: 1.25
                    }
                  ],
                  fillColor: '#F8FAFC',
                  margin: [8, 6, 8, 6]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 0.8,
            vLineWidth: () => 0.8,
            hLineColor: () => '#CBD5E1',
            vLineColor: () => '#CBD5E1'
          },
          margin: [0, 0, 0, 16]
        },
        {
          columns: [
            {
              stack: [
                { text: 'Client Acceptance & Sign-off:', bold: true, fontSize: 8.8, color: '#1F4E79' },
                { text: `${companyName}`, fontSize: 8.2, color: '#4A5568', margin: [0, 2, 0, 0] },
                { text: '\n\n_________________________________', color: '#CBD5E1', fontSize: 8 },
                { text: 'Authorized Signature & Company Seal', fontSize: 7.8, color: '#718096', margin: [0, 2, 0, 0] }
              ],
              width: '*'
            },
            {
              stack: [
                { text: 'For Bit Byte Technologies:', bold: true, fontSize: 8.8, color: '#1F4E79', alignment: 'right' },
                { text: 'Salem Corporate Office', fontSize: 8.2, color: '#4A5568', alignment: 'right', margin: [0, 2, 0, 0] },
                { text: '\n\n_________________________________', color: '#CBD5E1', fontSize: 8, alignment: 'right' },
                { text: 'Authorized Signatory', fontSize: 7.8, color: '#718096', alignment: 'right', margin: [0, 2, 0, 0] }
              ],
              width: '*'
            }
          ],
          margin: [0, 0, 0, 16]
        }
      ] : []),

      // Closing Delimiter
      {
        text: '*** End of the Quotation Proposal ***',
        bold: true,
        fontSize: 9,
        alignment: 'center',
        color: '#718096',
        margin: [0, 0, 0, 0]
      }
    ]
  };

  return printer.createPdfKitDocument(docDefinition);
}

export function legacyQuotationPdfBuffer(quotation) {
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = createLegacyQuotationPdfDocument(quotation);
      const chunks = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
}
