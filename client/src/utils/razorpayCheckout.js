let razorpayScriptPromise;

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export async function openRazorpayCheckout(order) {
  await loadRazorpayCheckout();

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: '#0F172A' },
      handler: resolve,
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled before completion')),
      },
    });

    checkout.open();
  });
}
