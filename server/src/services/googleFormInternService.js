import InternInvoice from '../models/InternInvoice.js';
import { nextInternId } from '../utils/idGenerator.js';

function clean(value) {
  return String(value || '').trim();
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getGoogleSheetCsvUrl() {
  const directUrl = clean(process.env.GOOGLE_FORM_RESPONSES_CSV_URL || process.env.GOOGLE_SHEET_CSV_URL);
  if (directUrl) return directUrl;

  const sheetId = clean(process.env.GOOGLE_SHEET_ID);
  if (!sheetId) {
    throw Object.assign(new Error('Google Form response sheet is not configured'), { status: 422 });
  }

  const gid = clean(process.env.GOOGLE_SHEET_GID || '0');
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => clean(value))) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => clean(value))) rows.push(row);
  return rows;
}

function rowsFromCsv(text) {
  const parsed = parseCsv(text);
  if (parsed.length < 2) return [];

  const headers = parsed[0].map(normalizeHeader);
  return parsed.slice(1).map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = clean(values[index]);
    });
    return row;
  });
}

function pick(row, labels) {
  for (const label of labels) {
    const value = row[normalizeHeader(label)];
    if (value) return value;
  }
  return '';
}

function mapResponse(row) {
  const email = pick(row, ['Email Id', 'Email', 'Email Address', 'Mail Id']).toLowerCase();
  const phone = pick(row, ['Mobile No', 'Mobile Number', 'Phone', 'Phone Number', 'Contact Number', 'Contact No']);
  const timestamp = pick(row, ['Timestamp', 'Submitted At', 'Created At']);

  return {
    employeeName: pick(row, ['Name', 'Full Name', 'Student Name', 'Intern Name']),
    email,
    collegeName: pick(row, ['Institution', 'Institution Name', 'College Name', 'College', 'University']),
    courseMajor: pick(row, ['Course Major', 'Course', 'Major', 'Department', 'Branch']),
    address: pick(row, ['Address', 'Residential Address', 'Current Address']),
    phone,
    position: pick(row, ['Position Intern Designation', 'Position: Intern Designation', 'Position', 'Intern Designation', 'Designation', 'Role']),
    sourceRowId: [timestamp, email, phone].filter(Boolean).join('|'),
    formResponse: row
  };
}

function importKey(payload) {
  if (payload.sourceRowId) return { source: 'Google Form', sourceRowId: payload.sourceRowId };
  if (payload.email) return { email: payload.email };
  if (payload.phone) return { phone: payload.phone };
  return null;
}

export async function syncGoogleFormInterns() {
  const url = getGoogleSheetCsvUrl();
  const response = await fetch(url);
  if (!response.ok) {
    throw Object.assign(new Error(`Unable to fetch Google Form responses (${response.status})`), { status: 502 });
  }

  const csv = await response.text();
  const rows = rowsFromCsv(csv);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const payload = mapResponse(row);
    const key = importKey(payload);
    if (!payload.employeeName || !payload.address || !payload.phone || !key) {
      skipped += 1;
      continue;
    }

    const existing = await InternInvoice.findOne(key);
    const update = {
      employeeName: payload.employeeName,
      email: payload.email,
      collegeName: payload.collegeName,
      courseMajor: payload.courseMajor,
      address: payload.address,
      phone: payload.phone,
      position: payload.position,
      source: 'Google Form',
      sourceRowId: payload.sourceRowId,
      sourceSyncedAt: new Date(),
      formResponse: payload.formResponse
    };

    if (existing) {
      Object.assign(existing, update);
      await existing.save();
      updated += 1;
    } else {
      await InternInvoice.create({
        internId: await nextInternId(),
        ...update,
        paymentReceived: false,
        amount: 0
      });
      created += 1;
    }
  }

  return { created, updated, skipped, totalRows: rows.length };
}
