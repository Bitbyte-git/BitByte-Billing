import crypto from 'crypto';

function clean(value) {
  return String(value || '').trim();
}

export function getRazorpayKeyId() {
  return clean(process.env.RAZORPAY_KEY_ID);
}

function getRazorpayKeySecret() {
  return clean(process.env.RAZORPAY_KEY_SECRET);
}

function requireRazorpayConfig() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    throw Object.assign(new Error('Razorpay test keys are not configured'), { status: 422 });
  }
  return { keyId, keySecret };
}

export function toRazorpayAmount(amount) {
  const paise = Math.round(Number(amount || 0) * 100);
  if (!Number.isFinite(paise) || paise <= 0) {
    throw Object.assign(new Error('Payment amount must be greater than zero'), { status: 422 });
  }
  return paise;
}

export async function createRazorpayOrder({ amount, receipt, notes = {} }) {
  const { keyId, keySecret } = requireRazorpayConfig();
  const currency = clean(process.env.RAZORPAY_CURRENCY || 'INR');
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: toRazorpayAmount(amount),
      currency,
      receipt: clean(receipt).slice(0, 40),
      notes,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.description || 'Unable to create Razorpay order'), { status: 502 });
  }

  return payload;
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const keySecret = getRazorpayKeySecret();
  if (!keySecret) {
    throw Object.assign(new Error('Razorpay key secret is not configured'), { status: 422 });
  }

  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(clean(signature));
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
