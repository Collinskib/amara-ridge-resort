'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.VERCEL = '1';            // mutable data → /tmp, repo data stays clean
process.env.ADMIN_TOKEN = 'test-admin-token';

const { createServer } = require('../lib/app');

let base, server, bookingRef;
const guest = { firstName: 'Test', lastName: 'Guest', email: 'test@guest.dev', phone: '+254712345678' };
const inX = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
const ci = inX(14), co = inX(17); // 3-night stay in the future

test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const j = (r) => r.json();
const post = (path, body, headers = {}) =>
  fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('GET / serves the SPA shell with security headers', async () => {
  const r = await fetch(base + '/');
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.ok(r.headers.get('content-security-policy'));
  assert.ok(r.headers.get('x-content-type-options'));
});

test('GET /api/rooms lists all rooms with photos, no inventory leak', async () => {
  const rooms = await fetch(base + '/api/rooms').then(j);
  assert.strictEqual(rooms.length, 7);
  assert.ok(rooms.every((r) => r.photo && r.slug));
  assert.ok(rooms.every((r) => r.inventory === undefined));
});

test('POST /api/availability prices a stay and respects capacity', async () => {
  const d = await post('/api/availability', { checkin: ci, checkout: co, adults: 2, children: 0 }).then(j);
  assert.strictEqual(d.nights, 3);
  const villa = d.rooms.find((r) => r.slug === 'lakeside-villa');
  assert.ok(villa.available >= 1 && villa.quote.total > villa.quote.subtotal); // VAT included
  const tiny = await post('/api/availability', { checkin: ci, checkout: co, adults: 5, children: 2 }).then(j);
  assert.ok(tiny.rooms.every((r) => r.capacity >= 7));
});

test('booking lifecycle: create → lookup → modify → pay → cancel', async () => {
  // create
  const made = await post('/api/bookings', { room: 'executive-suite', checkin: ci, checkout: co, adults: 2, children: 1, guest }).then(j);
  bookingRef = made.booking.ref;
  assert.match(bookingRef, /^AR-[0-9A-F]{6}$/);
  assert.strictEqual(made.booking.paymentStatus, 'pending');
  assert.strictEqual(made.booking.adults, 2);

  // lookup: wrong email rejected, right email OK
  assert.strictEqual((await fetch(`${base}/api/bookings/${bookingRef}?email=x@x.dev`)).status, 403);
  const found = await fetch(`${base}/api/bookings/${bookingRef}?email=${guest.email}`).then(j);
  assert.strictEqual(found.room.name, 'Executive Suite');

  // modify: shift the stay by 2 days, verify total changes and is re-priced
  const moved = await fetch(`${base}/api/bookings/${bookingRef}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: guest.email, checkin: inX(20), checkout: inX(23), adults: 2, children: 1 }),
  }).then(j);
  assert.strictEqual(moved.booking.checkin, inX(20));
  assert.ok(moved.booking.pricing.total > 0);

  // simulated M-Pesa payment
  const paid = await post('/api/payments/mpesa', { ref: bookingRef, email: guest.email, phone: '0712345678' }).then(j);
  assert.strictEqual(paid.booking.paymentStatus, 'paid');
  assert.match(paid.booking.payment.receipt, /^MPX[0-9A-F]{8}$/);

  // cancel
  const gone = await fetch(`${base}/api/bookings/${bookingRef}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: guest.email }),
  }).then(j);
  assert.strictEqual(gone.booking.status, 'cancelled');
});

test('booking validation rejects bad input', async () => {
  assert.strictEqual((await post('/api/bookings', { room: 'nope', checkin: ci, checkout: co, adults: 1, children: 0, guest })).status, 400);
  assert.strictEqual((await post('/api/bookings', { room: 'executive-suite', checkin: co, checkout: ci, adults: 1, children: 0, guest })).status, 400);
  assert.strictEqual((await post('/api/bookings', { room: 'executive-suite', checkin: ci, checkout: co, adults: 1, children: 0, guest: { ...guest, email: 'bad' } })).status, 400);
});

test('newsletter, contact honeypot, weather, calendar, promo', async () => {
  await post('/api/newsletter', { email: 'a@b.dev' }).then(j);
  const honey = await post('/api/contact', { name: 'Bot', email: 'b@b.dev', message: 'spam', website: 'http://spam' }).then(j);
  assert.match(honey.message, /received/); // accepted but silently dropped

  const wx = await fetch(base + '/api/weather').then(j);
  assert.strictEqual(wx.forecast.length, 5);
  assert.strictEqual(wx.location, 'Kitale Highlands, Kenya');

  const cal = await fetch(base + '/api/rooms/executive-suite/calendar?month=' + ci.slice(0, 7)).then(j);
  assert.ok(Array.isArray(cal.fullDates));

  const promo = await fetch(base + '/api/promo/amara10').then(j);
  assert.strictEqual(promo.value, 10);
});

test('admin endpoints are token-gated', async () => {
  assert.strictEqual((await fetch(base + '/api/admin/overview')).status, 401);
  const auth = { Authorization: 'Bearer test-admin-token' };
  const ov = await fetch(base + '/api/admin/overview', { headers: auth }).then(j);
  assert.ok('occupancyNext30d' in ov && 'revenueKES' in ov);
  const bookings = await fetch(base + '/api/admin/bookings', { headers: auth }).then(j);
  assert.ok(Array.isArray(bookings));
});

test('path traversal and unknown API routes are refused', async () => {
  assert.strictEqual((await fetch(base + '/api/definitely-not-a-route')).status, 404);
  // path passed verbatim: raw /../ is normalized away by URL parsing (404),
  // and the encoded variant /%2e%2e/ hits the explicit guard (403) — both refused.
  const raw = await new Promise((resolve) => {
    require('node:http').get({ hostname: '127.0.0.1', port: server.address().port, path: '/../server.js' },
      (r) => { r.resume(); resolve(r.statusCode); });
  });
  assert.ok([403, 404].includes(raw));
  const encoded = await fetch(base + '/%2e%2e/server.js').catch(() => null);
  if (encoded) assert.ok([403, 404].includes(encoded.status));
});
