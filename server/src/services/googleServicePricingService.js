import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Service from '../models/Service.js';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function clean(value) {
  return String(value || '').trim();
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parseServiceAccount() {
  const keyFile = clean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
  const inlineJson = clean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

  let raw = '';
  if (keyFile) {
    const directPath = path.resolve(process.cwd(), keyFile);
    const serverPath = path.resolve(SERVER_ROOT, keyFile);
    raw = fs.readFileSync(fs.existsSync(directPath) ? directPath : serverPath, 'utf8');
  } else if (inlineJson) {
    raw = inlineJson;
  } else {
    throw Object.assign(new Error('Google service account credentials are not configured'), { status: 422 });
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(
      new Error('Google service account JSON is invalid. Use one-line escaped JSON or GOOGLE_SERVICE_ACCOUNT_KEY_FILE.'),
      { status: 422 },
    );
  }
}

function getSpreadsheetId(value) {
  const raw = clean(value);
  if (!raw) return '';
  const match = raw.match(/\/spreadsheets\/d\/([^/]+)/);
  return match ? match[1] : raw;
}

function sheetRange(sheetName, cells) {
  const escapedName = clean(sheetName).replace(/'/g, "''");
  return `'${escapedName}'!${cells}`;
}

export async function listServicePricingSheetTitles() {
  const spreadsheetId = getSpreadsheetId(process.env.GOOGLE_SERVICE_PRICING_SPREADSHEET_ID);
  if (!spreadsheetId) return [];

  const accessToken = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || 'Unable to read Google spreadsheet metadata'), { status: 502 });
  }

  return (payload.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean);
}

async function getAccessToken() {
  const account = parseServiceAccount();
  if (!account.client_email || !account.private_key) {
    throw Object.assign(new Error('Google service account must include client_email and private_key'), { status: 422 });
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: account.client_email,
    scope: SHEETS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(account.private_key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${base64Url(signature)}`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error_description || payload.error || 'Unable to authenticate with Google Sheets'), { status: 502 });
  }
  return payload.access_token;
}

function field(row, names) {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (clean(value)) return clean(value);
  }
  return '';
}

function normalizeStatus(value) {
  const status = clean(value).toLowerCase();
  return status === 'inactive' ? 'Inactive' : 'Active';
}

function mapSheetRows(values) {
  if (!Array.isArray(values) || values.length < 2) return [];

  const headers = values[0].map(normalizeHeader);
  return values.slice(1).map((cells, index) => {
    const row = {};
    headers.forEach((header, cellIndex) => {
      row[header] = clean(cells[cellIndex]);
    });

    const priceText = field(row, ['basePrice', 'base price', 'price', 'cost', 'service cost']).replace(/[^0-9.-]/g, '');
    return {
      rowNumber: index + 2,
      name: field(row, ['name', 'service', 'service name']),
      description: field(row, ['description', 'details']),
      sacCode: field(row, ['sacCode', 'sac code', 'SAC']),
      basePrice: Number(priceText),
      status: normalizeStatus(field(row, ['status'])),
    };
  });
}

export async function syncServicePricingFromGoogleSheet() {
  const spreadsheetId = getSpreadsheetId(process.env.GOOGLE_SERVICE_PRICING_SPREADSHEET_ID);
  const sheetName = clean(process.env.GOOGLE_SERVICE_PRICING_SHEET_NAME || 'Services');
  if (!spreadsheetId) {
    throw Object.assign(new Error('GOOGLE_SERVICE_PRICING_SPREADSHEET_ID is not configured'), { status: 422 });
  }

  const accessToken = await getAccessToken();
  const range = sheetRange(sheetName, 'A1:E');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || 'Unable to read Google pricing sheet'), { status: 502 });
  }

  const rows = mapSheetRows(payload.values);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    if (!row.name || !Number.isFinite(row.basePrice) || row.basePrice < 0) {
      skipped += 1;
      errors.push(`Row ${row.rowNumber}: service name and valid base price are required`);
      continue;
    }

    const existing = await Service.findOne({ name: row.name });
    await Service.findOneAndUpdate(
      { name: row.name },
      {
        name: row.name,
        description: row.description,
        sacCode: row.sacCode,
        basePrice: row.basePrice,
        status: row.status,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (existing) updated += 1;
    else created += 1;
  }

  return {
    created,
    updated,
    skipped,
    totalRows: rows.length,
    errors,
    sheetName,
  };
}
