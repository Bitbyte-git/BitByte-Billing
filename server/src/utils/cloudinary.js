import crypto from 'crypto';

const DEFAULT_FOLDER = 'bit-byte/quotation-attachments';
const CLOUD_NAME_PATTERN = /^[a-z0-9_-]+$/;

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw Object.assign(new Error('Cloudinary is not configured on the server'), { status: 500 });
  }

  if (!CLOUD_NAME_PATTERN.test(cloudName)) {
    throw Object.assign(new Error('CLOUDINARY_CLOUD_NAME must be the Cloudinary cloud name, not the API key name'), {
      status: 500
    });
  }

  return { cloudName, apiKey, apiSecret };
}

function signUploadParams(params, apiSecret) {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

export async function uploadDataUrlToCloudinary({ fileData, folder = process.env.CLOUDINARY_FOLDER || DEFAULT_FOLDER }) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = signUploadParams(params, apiSecret);

  const body = new FormData();
  body.append('file', fileData);
  body.append('api_key', apiKey);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body
  });
  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(data?.error?.message || 'Cloudinary upload failed'), { status: response.status });
  }

  return data;
}
