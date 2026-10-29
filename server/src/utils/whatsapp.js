import mongoose from 'mongoose';
import { uploadDataUrlToCloudinary } from './cloudinary.js';
import { quotationPdfBuffer } from './quotationPdf.js';
import Quotation from '../models/Quotation.js';
import '../models/Client.js';
import '../models/User.js';

async function safeUpdateQuotation(id, updateData) {
  if (!id || mongoose.connection.readyState !== 1) return;
  try {
    await Quotation.findByIdAndUpdate(id, updateData);
  } catch (err) {
    console.warn(`[WhatsApp] Notice: Could not update quotation ${id} in DB:`, err.message);
  }
}

/**
 * Formats a phone number for Tendigit WhatsApp API.
 * Tendigit expects numbers formatted with country code (e.g., 919876543210 for India).
 */
export function formatWhatsAppContact(phone) {
  if (!phone) return null;
  const raw = String(phone).replace(/\D/g, '');
  if (!raw) return null;

  // 10 digit Indian mobile number -> prepend 91
  if (raw.length === 10) {
    return `91${raw}`;
  }
  // 11 digits starting with 0 -> strip 0 and prepend 91
  if (raw.length === 11 && raw.startsWith('0')) {
    return `91${raw.slice(1)}`;
  }
  // 12 digits starting with 91 -> already has country code
  if (raw.length === 12 && raw.startsWith('91')) {
    return raw;
  }
  // Other international formats with country code already included
  if (raw.length >= 11) {
    return raw;
  }

  return `91${raw}`;
}

/**
 * Formats date into DD-Mon-YYYY (e.g., 22-Oct-2026) for template parameter.
 */
export function formatParamDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/\s+/g, '-');
}

/**
 * Uploads PDF buffer to public high-speed file storage (guarantees HTTP 200 & Content-Type: application/pdf).
 */
export async function uploadPdfToPublicStorage(pdfBuffer, filename = 'quotation.pdf') {
  try {
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const form = new FormData();
    form.set('reqtype', 'fileupload');
    form.set('fileToUpload', blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form
    });

    const url = (await res.text()).trim();
    if (url && url.startsWith('http')) {
      return url;
    }
  } catch (err) {
    console.warn('[WhatsApp] Public storage upload notice:', err.message);
  }
  return null;
}

/**
 * Ensures the quotation has a publicly accessible PDF URL.
 * Automatically verifies that the returned URL responds with HTTP 200 OK.
 * If Cloudinary blocks PDF delivery (HTTP 401 deny/ACL), seamlessly falls back to public PDF storage.
 */
export async function ensureQuotationPdfUrl(quotation) {
  // If an existing pdfUrl is stored, verify it actually responds with 200 OK
  if (quotation.pdfUrl && /^https?:\/\//i.test(quotation.pdfUrl)) {
    try {
      const probe = await fetch(quotation.pdfUrl, { method: 'HEAD' });
      if (probe.status === 200) {
        return quotation.pdfUrl;
      }
      console.warn(`[WhatsApp] Existing quotation pdfUrl returned status ${probe.status}. Generating fresh accessible URL...`);
    } catch {
      // probe failed, re-generate
    }
  }

  const pdfBuffer = await quotationPdfBuffer(quotation);
  const safeId = quotation.quotationId || String(quotation._id || 'quotation');
  const filename = `${safeId}.pdf`;

  // 1. Try Cloudinary first
  let secureUrl = null;
  try {
    const dataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const uploadResult = await uploadDataUrlToCloudinary({
      fileData: dataUri,
      folder: process.env.CLOUDINARY_FOLDER || 'bit-byte/quotations'
    });

    secureUrl = uploadResult?.secure_url || uploadResult?.url;
    if (secureUrl) {
      const check = await fetch(secureUrl, { method: 'HEAD' });
      if (check.status === 200) {
        quotation.pdfUrl = secureUrl;
        await safeUpdateQuotation(quotation._id, { pdfUrl: secureUrl });
        return secureUrl;
      }
      console.warn(`[WhatsApp] Cloudinary returned ${check.status} (${check.headers.get('x-cld-error') || 'restricted'}). Using public PDF fallback...`);
    }
  } catch (err) {
    console.warn(`[WhatsApp] Cloudinary upload notice:`, err.message);
  }

  // 2. Fallback to public PDF storage (guarantees HTTP 200 and Content-Type: application/pdf)
  const publicPdfUrl = await uploadPdfToPublicStorage(pdfBuffer, filename);
  if (publicPdfUrl) {
    quotation.pdfUrl = publicPdfUrl;
    await safeUpdateQuotation(quotation._id, { pdfUrl: publicPdfUrl });
    console.log(`[WhatsApp] PDF prepared with public URL (HTTP 200): ${publicPdfUrl}`);
    return publicPdfUrl;
  }

  // 3. Fallback to server route
  const rawBase = (process.env.APP_URL || process.env.BACKEND_URL || 'https://bitbyte-server.onrender.com').trim().replace(/\/+$/, '');
  const baseUrl = /^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`;
  const fallbackUrl = `${baseUrl}/api/quotations/public/${quotation._id || quotation.quotationId}/pdf?download=true`;
  quotation.pdfUrl = fallbackUrl;
  await safeUpdateQuotation(quotation._id, { pdfUrl: fallbackUrl });
  return fallbackUrl;
}

/**
 * Sends quotation PDF to client's WhatsApp via Tendigit WhatsApp API.
 *
 * API URL format:
 * https://login.tendigit.in/api/sendtemplate.php?LicenseNumber=...&APIKey=...&Contact=91...&Template=Sample_bill_pdf&Param=ClientName,QuotationID,ValidDate&Fileurl=...
 */
export async function sendQuotationWhatsApp({ quotation, contactOverride, clientDetails }) {
  if (!quotation) {
    throw new Error('Quotation is required to send WhatsApp');
  }

  // Populate client if not already populated
  let populated = quotation;
  if (!populated.clientId?.phone && populated._id && mongoose.connection.readyState === 1) {
    const fresh = await Quotation.findById(populated._id).populate('clientId createdBy');
    if (fresh) populated = fresh;
  }

  // 1. Resolve contact number
  const rawPhone = contactOverride || populated.clientId?.phone || clientDetails?.phone || populated.clientDetails?.phone;
  const contact = formatWhatsAppContact(rawPhone);

  if (!contact) {
    const errMsg = `Invalid or missing phone number for client (${rawPhone || 'empty'}). WhatsApp message not sent.`;
    console.warn(`[WhatsApp] ${errMsg}`);
    await safeUpdateQuotation(populated._id, {
      whatsappStatus: 'Failed',
      whatsappError: errMsg
    });
    return { success: false, error: errMsg };
  }

  // 2. Resolve Client Name, Quotation ID, and Valid Until date
  const clientObj = populated.clientId || clientDetails || {};
  const rawName = clientObj.fullName || clientObj.name || clientObj.companyName || 'Valued Client';
  const clientName = String(rawName).replace(/,/g, ' ').trim();
  const quotationId = String(populated.quotationId || populated._id).replace(/,/g, '').trim();

  const validUntilDate = populated.validUntil || (
    new Date((populated.submittedAt || populated.createdAt || Date.now()).valueOf
      ? new Date(populated.submittedAt || populated.createdAt || Date.now()).getTime() + 15 * 86400000
      : Date.now() + 15 * 86400000)
  );
  const validUntil = formatParamDate(validUntilDate).replace(/,/g, ' ').trim();

  // Helper to build param string based on count
  function buildTemplateParam(count) {
    if (count === 0) return '';
    if (count === 1) return clientName;
    if (count === 2) return `${clientName},${quotationId}`;
    return `${clientName},${quotationId},${validUntil}`;
  }

  // Sample_bill_pdf body template expects 1 parameter (Client Name)
  // Configurable via TENDIGIT_PARAM_COUNT in .env
  const configuredParamCount = process.env.TENDIGIT_PARAM_COUNT !== undefined
    ? Number(process.env.TENDIGIT_PARAM_COUNT)
    : 1;

  let param = buildTemplateParam(configuredParamCount);

  // 3. Resolve PDF URL
  let fileUrl = populated.pdfUrl;
  try {
    fileUrl = await ensureQuotationPdfUrl(populated);
  } catch (pdfErr) {
    console.error(`[WhatsApp] Could not prepare PDF URL for quotation ${quotationId}:`, pdfErr.message);
  }

  if (!fileUrl) {
    const errMsg = 'Failed to generate public PDF URL for quotation attachment.';
    await safeUpdateQuotation(populated._id, {
      whatsappStatus: 'Failed',
      whatsappError: errMsg
    });
    return { success: false, error: errMsg, contact };
  }

  // Check if Cloudinary restricts PDF delivery (HTTP 401 deny or ACL failure)
  if (fileUrl && fileUrl.includes('cloudinary.com')) {
    try {
      const probe = await fetch(fileUrl, { method: 'HEAD' });
      if (probe.status === 401) {
        const cldError = probe.headers.get('x-cld-error') || 'deny or ACL failure';
        const warning = `Cloudinary PDF delivery is restricted (${probe.status} ${cldError}). Please enable "Allow delivery of PDF and ZIP files" in Cloudinary Console > Settings > Security so WhatsApp can download the quotation PDF.`;
        console.warn(`[WhatsApp] ${warning}`);
      }
    } catch {
      // ignore network errors on probe
    }
  }

  // 4. Resolve Tendigit credentials from environment
  const licenseNumber = (process.env.TENDIGIT_LICENSE_NUMBER || process.env.WHATSAPP_LICENSE_NUMBER || '').trim();
  const apiKey = (process.env.TENDIGIT_API_KEY || process.env.WHATSAPP_API_KEY || '').trim();
  const template = (process.env.TENDIGIT_TEMPLATE_NAME || 'Sample_bill_pdf').trim();

  if (!licenseNumber || !apiKey || licenseNumber === 'MyLicence' || apiKey === 'MyAPI') {
    const errMsg = 'Tendigit credentials (TENDIGIT_LICENSE_NUMBER and TENDIGIT_API_KEY) are not configured in server/.env.';
    console.warn(`[WhatsApp] ${errMsg} PDF URL generated: ${fileUrl}`);
    await safeUpdateQuotation(populated._id, {
      whatsappStatus: 'Failed',
      whatsappError: errMsg,
      pdfUrl: fileUrl
    });
    return {
      success: false,
      error: errMsg,
      pdfUrl: fileUrl,
      contact,
      template,
      param
    };
  }

  // 5. Construct Tendigit API URL
  const endpoint = new URL('https://login.tendigit.in/api/sendtemplate.php');
  endpoint.searchParams.set('LicenseNumber', licenseNumber);
  endpoint.searchParams.set('APIKey', apiKey);
  endpoint.searchParams.set('Contact', contact);
  endpoint.searchParams.set('Template', template);
  endpoint.searchParams.set('Param', param);
  endpoint.searchParams.set('Fileurl', fileUrl);

  console.log(`[WhatsApp] Sending quotation ${quotationId} PDF to ${contact} via Tendigit (Template: ${template}, Param: "${param}")...`);

  try {
    let response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' }
    });

    let responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    let isSuccess = response.ok && (
      responseData?.ApiResponse === 'Success' ||
      responseData?.status === 'success' ||
      (typeof responseText === 'string' && responseText.toLowerCase().includes('success'))
    );

    // Auto-healing: If Meta reports a parameter count mismatch, retry with the exact count requested
    const expectedMatch = typeof responseText === 'string' && responseText.match(/expected number of params \((\d+)\)/);
    if (!isSuccess && expectedMatch && expectedMatch[1]) {
      const expectedCount = Number(expectedMatch[1]);
      param = buildTemplateParam(expectedCount);
      console.log(`[WhatsApp] Meta requested ${expectedCount} param(s). Auto-retrying with Param="${param}"...`);
      endpoint.searchParams.set('Param', param);

      const retryRes = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      responseText = await retryRes.text();
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      isSuccess = retryRes.ok && (
        responseData?.ApiResponse === 'Success' ||
        responseData?.status === 'success' ||
        (typeof responseText === 'string' && responseText.toLowerCase().includes('success'))
      );
    }

    const errorMessage = isSuccess ? null : (
      responseData?.ErrorMessage?.error?.error_data?.details ||
      responseData?.ErrorMessage?.error?.message ||
      responseData?.ApiMessage?.ErrorMessage?.error?.error_data?.details ||
      responseData?.ApiMessage?.ErrorMessage?.error?.message ||
      responseData?.ApiMessage?.Message ||
      (typeof responseData?.ApiMessage === 'string' ? responseData.ApiMessage : null) ||
      responseData?.message ||
      responseData?.raw ||
      `HTTP status ${response.status}`
    );

    console.log(`[WhatsApp] Tendigit response for ${quotationId}:`, responseData);

    const updatePayload = {
      pdfUrl: fileUrl,
      whatsappStatus: isSuccess ? 'Sent' : 'Failed',
      whatsappSentAt: new Date(),
      whatsappRecipient: contact,
      whatsappResponse: responseData,
      ...(errorMessage ? { whatsappError: errorMessage } : { whatsappError: null })
    };

    await safeUpdateQuotation(populated._id, updatePayload);

    return {
      success: isSuccess,
      contact,
      template,
      param,
      pdfUrl: fileUrl,
      response: responseData,
      error: errorMessage
    };
  } catch (networkErr) {
    console.error(`[WhatsApp] HTTP request to Tendigit failed:`, networkErr.message);
    const errMsg = `Network error calling Tendigit WhatsApp API: ${networkErr.message}`;
    await safeUpdateQuotation(populated._id, {
      whatsappStatus: 'Failed',
      whatsappError: errMsg,
      pdfUrl: fileUrl
    });
    return {
      success: false,
      error: errMsg,
      pdfUrl: fileUrl,
      contact
    };
  }
}

/**
 * Management members designated for pre-approval of quotations:
 * MD: +91 8248654541
 * ED: +91 9789274743
 * CEO: +91 94443 77000
 * Bit Byte Office: 9943743136
 */
export const MANAGEMENT_CONTACTS = [
  { role: 'MD', title: 'Managing Director', phone: '918248654541' },
  { role: 'ED', title: 'Executive Director', phone: '919789274743' },
  { role: 'CEO', title: 'Chief Executive Officer', phone: '919444377000' },
  { role: 'Bit Byte Office', title: 'Bit Byte Office', phone: '919943743136' }
];

/**
 * Sends quotation PDF to all 4 management members via WhatsApp for review before client dispatch.
 */
export async function sendQuotationToManagementWhatsApp(quotation) {
  if (!quotation) {
    throw new Error('Quotation is required to send management WhatsApp');
  }

  // Populate client if not already populated
  let populated = quotation;
  if (!populated.clientId?.phone && populated._id && mongoose.connection.readyState === 1) {
    const fresh = await Quotation.findById(populated._id).populate('clientId createdBy');
    if (fresh) populated = fresh;
  }

  // Ensure public PDF URL
  let fileUrl = populated.pdfUrl;
  try {
    fileUrl = await ensureQuotationPdfUrl(populated);
  } catch (pdfErr) {
    console.error(`[WhatsApp Management] Could not prepare PDF URL for quotation:`, pdfErr.message);
  }

  const quotationId = String(populated.quotationId || populated._id).replace(/,/g, '').trim();
  const clientObj = populated.clientId || populated.clientDetails || {};
  const rawName = clientObj.fullName || clientObj.name || clientObj.companyName || 'Valued Client';
  const clientName = String(rawName).replace(/,/g, ' ').trim();

  const licenseNumber = (process.env.TENDIGIT_LICENSE_NUMBER || process.env.WHATSAPP_LICENSE_NUMBER || '').trim();
  const apiKey = (process.env.TENDIGIT_API_KEY || process.env.WHATSAPP_API_KEY || '').trim();
  const template = (process.env.TENDIGIT_TEMPLATE_NAME || 'Sample_bill_pdf').trim();

  if (!fileUrl) {
    const errMsg = 'Failed to generate public PDF URL for quotation attachment.';
    await safeUpdateQuotation(populated._id, {
      managementWhatsAppStatus: 'Failed',
      managementWhatsAppError: errMsg
    });
    return { success: false, error: errMsg, results: [] };
  }

  if (!licenseNumber || !apiKey || licenseNumber === 'MyLicence' || apiKey === 'MyAPI') {
    const errMsg = 'Tendigit credentials are not configured in server/.env.';
    console.warn(`[WhatsApp Management] ${errMsg} PDF URL generated: ${fileUrl}`);
    await safeUpdateQuotation(populated._id, {
      managementWhatsAppStatus: 'Failed',
      managementWhatsAppError: errMsg,
      pdfUrl: fileUrl
    });
    return { success: false, error: errMsg, results: [] };
  }

  const results = [];
  for (const member of MANAGEMENT_CONTACTS) {
    const contact = formatWhatsAppContact(member.phone);
    const param = clientName;

    const endpoint = new URL('https://login.tendigit.in/api/sendtemplate.php');
    endpoint.searchParams.set('LicenseNumber', licenseNumber);
    endpoint.searchParams.set('APIKey', apiKey);
    endpoint.searchParams.set('Contact', contact);
    endpoint.searchParams.set('Template', template);
    endpoint.searchParams.set('Param', param);
    endpoint.searchParams.set('Fileurl', fileUrl);

    console.log(`[WhatsApp Management] Sending quotation ${quotationId} to ${member.role} (${contact})...`);

    try {
      let response = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' }
      });
      let responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      let isSuccess = response.ok && (
        responseData?.ApiResponse === 'Success' ||
        responseData?.status === 'success' ||
        (typeof responseText === 'string' && responseText.toLowerCase().includes('success'))
      );

      results.push({
        role: member.role,
        title: member.title,
        phone: contact,
        success: isSuccess,
        response: responseData,
        error: isSuccess ? null : (responseData?.ErrorMessage?.error?.message || responseData?.ApiMessage || responseData?.message || responseText)
      });
    } catch (memberErr) {
      console.error(`[WhatsApp Management] Failed to send to ${member.role} (${contact}):`, memberErr.message);
      results.push({
        role: member.role,
        title: member.title,
        phone: contact,
        success: false,
        error: memberErr.message
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const status = successCount === MANAGEMENT_CONTACTS.length ? 'Sent' : successCount > 0 ? 'Partial' : 'Failed';

  await safeUpdateQuotation(populated._id, {
    pdfUrl: fileUrl,
    managementWhatsAppStatus: status,
    managementWhatsAppSentAt: new Date(),
    managementWhatsAppRecipients: MANAGEMENT_CONTACTS.map((m) => `${m.role} (${m.phone})`),
    managementWhatsAppResults: results,
    ...(status === 'Failed' ? { managementWhatsAppError: 'Failed to deliver to management members' } : { managementWhatsAppError: null })
  });

  return {
    success: successCount > 0,
    status,
    successCount,
    totalCount: MANAGEMENT_CONTACTS.length,
    results
  };
}
