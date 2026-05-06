var Stripe = require('stripe');

// Product catalog
// Stripe unit_amount cent হিসেবে নেয়
// 199 = $1.99
// 799 = $7.99
var PRODUCTS = {
  google:   { name: 'Google Ads Audit',              price: 199 },
  seo:      { name: 'SEO Audit',                     price: 199 },
  website:  { name: 'Website Audit',                 price: 199 },
  tracking: { name: 'Tracking Audit',                price: 199 },
  meta:     { name: 'Meta Ads Audit',                price: 199 },
  bundle:   { name: 'Complete Growth Audit (All 5)', price: 799 }
};

// Coupon codes
// Website এ user লিখবে TEST100
// Stripe coupon ID ও TEST100
var COUPONS = {
  'TEST100': 'TEST100'
};

module.exports = function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  var items = req.body.items;
  var coupon = req.body.coupon;
  var customer = req.body.customer || {};

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items in cart' });
  }

  // Build Stripe line_items from cart
  var lineItems = [];

  for (var i = 0; i < items.length; i++) {
    var id = items[i];

    if (!PRODUCTS[id]) {
      return res.status(400).json({ error: 'Unknown product: ' + id });
    }

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: PRODUCTS[id].name,
          description: 'Delivered within 48 hours · Cleaners Growth'
        },
        unit_amount: PRODUCTS[id].price
      },
      quantity: 1
    });
  }

  // Build session params
  var sessionParams = {
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: customer.email || undefined,
    success_url: process.env.SITE_URL + '/success.html?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: process.env.SITE_URL + '/',
    metadata: {
      name: customer.name || '',
      business: customer.business || '',
      phone: customer.phone || '',
      website: customer.website || '',
      city: customer.city || '',
      items: items.join(', ')
    }
  };

  // Apply coupon if provided and valid
  var couponCode = (coupon || '').trim().toUpperCase();

  if (couponCode && COUPONS[couponCode]) {
    sessionParams.discounts = [
      {
        coupon: COUPONS[couponCode]
      }
    ];
  }

  stripe.checkout.sessions.create(sessionParams)
    .then(function(session) {
      return res.status(200).json({ url: session.url });
    })
    .catch(function(err) {
      console.error('Stripe error:', err.message);
      return res.status(500).json({ error: err.message });
    });
};
