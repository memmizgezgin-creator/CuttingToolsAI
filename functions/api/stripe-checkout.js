// ToolAdvisor — Cloudflare Pages Function: Stripe Checkout Session
// Route: /api/stripe-checkout
//
// Required env vars in Cloudflare Pages:
//   STRIPE_SECRET_KEY   — sk_live_... (or sk_test_... for testing)
//   STRIPE_PRICE_ID     — price_... (your Pro monthly price ID from Stripe dashboard)
//   APP_URL             — https://tooladvisor.eu (no trailing slash)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const secretKey = env.STRIPE_SECRET_KEY;
  const priceId   = env.STRIPE_PRICE_ID;
  const appUrl    = (env.APP_URL || 'https://tooladvisor.eu').replace(/\/$/, '');

  if (!secretKey || !priceId) {
    return json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Cloudflare Pages environment variables.' }, 500);
  }

  let body = {};
  try { body = await request.json(); } catch { /* ok */ }

  // Build the checkout session payload
  const params = new URLSearchParams({
    'mode':                                 'subscription',
    'payment_method_types[]':               'card',
    'line_items[0][price]':                 priceId,
    'line_items[0][quantity]':              '1',
    'success_url':                          `${appUrl}/pro.html?session_id={CHECKOUT_SESSION_ID}&status=success`,
    'cancel_url':                           `${appUrl}/pro.html?status=cancelled`,
    'allow_promotion_codes':                'true',
    'billing_address_collection':           'auto',
    'subscription_data[trial_period_days]': '14',
  });

  // Optionally pre-fill email if provided
  if (body.email) {
    params.set('customer_email', body.email);
  }

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return json({ error: session.error?.message || 'Stripe error' }, stripeRes.status);
    }

    return json({ url: session.url }, 200);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: CORS });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
