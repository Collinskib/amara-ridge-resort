'use strict';
/*
 * Amara Ridge Resort — request handler (shared by server.js and Vercel's
 * serverless entrypoint api/index.js). Zero-dependency.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./store');

const PUBLIC = path.join(__dirname, '..', 'public');
const VAT_RATE = 0.16;
const EXTRA_GUEST_FEE = 2500; // KES per night per guest over the included 2
const MAX_NIGHTS = 30;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'amara-demo-admin';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
const CSP = "default-src 'self'; img-src 'self' data:; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'";

/* ---------- helpers ---------- */

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    ...SEC_HEADERS,
    ...(type.startsWith('text/html') ? { 'Content-Security-Policy': CSP } : {}),
  });
  res.end(data);
}

const ok = (res, data) => send(res, 200, data);
const bad = (res, msg, status = 400) => send(res, status, { error: msg });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

/* naive in-memory rate limit: 40 writes/min per IP (Vercel-aware via x-forwarded-for) */
const buckets = new Map();
function rateLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.reset) { b = { n: 0, reset: now + 60_000 }; buckets.set(ip, b); }
  if (buckets.size > 10_000) buckets.clear();
  return ++b.n > 40;
}

function parseDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const d = new Date(s + 'T00:00:00Z');
  return isNaN(d) ? null : d;
}

const isoDay = (d) => d.toISOString().slice(0, 10);

function eachNight(checkin, checkout) {
  const nights = [];
  for (let d = new Date(checkin); d < checkout; d.setUTCDate(d.getUTCDate() + 1)) {
    nights.push(new Date(d));
  }
  return nights;
}

const overlaps = (aIn, aOut, bIn, bOut) => aIn < bOut && bIn < aOut;

const isAdmin = (req) => req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;
const emailOK = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');
const phoneOK = (p) => /^\+?[\d\s()-]{7,20}$/.test(p || '');

/* ---------- pricing engine ---------- */

function nightlyRate(room, date) {
  let rate = room.rate;
  const dow = date.getUTCDay();
  const m = date.getUTCMonth();
  const day = date.getUTCDate();
  if (dow === 5 || dow === 6) rate *= 1.15;                            // Fri/Sat markup
  if ((m === 11 && day >= 20) || (m === 0 && day <= 5) || m === 6 || m === 7) rate *= 1.2; // peak season
  return Math.round(rate);
}

function isPeak(d) {
  const m = d.getUTCMonth(), day = d.getUTCDate();
  return (m === 11 && day >= 20) || (m === 0 && day <= 5) || m === 6 || m === 7;
}

function quote(room, checkin, checkout, adults, children, promoCode) {
  const nights = eachNight(checkin, checkout);
  const guests = adults + children;
  const extraGuests = Math.max(0, guests - 2);
  const breakdown = nights.map((d) => {
    const base = nightlyRate(room, d);
    const extra = extraGuests * EXTRA_GUEST_FEE;
    return { date: isoDay(d), base, extraGuests: extra, total: base + extra,
      weekend: [5, 6].includes(d.getUTCDay()), peak: isPeak(d) };
  });
  const subtotal = breakdown.reduce((s, n) => s + n.total, 0);

  let discount = 0, promo = null;
  if (promoCode) {
    const code = String(promoCode).trim().toUpperCase();
    const p = store.site().promoCodes[code];
    if (p) {
      const qualifies =
        (!p.minNights || nights.length >= p.minNights) &&
        (!p.roomTypes || p.roomTypes.includes(room.type)) &&
        (code !== 'WEEKDAY' || breakdown.every((n) => !n.weekend));
      if (qualifies) {
        discount = Math.round(subtotal * (p.value / 100));
        promo = { code, description: p.description };
      } else {
        promo = { code, error: 'Code does not apply to this selection' };
      }
    } else {
      promo = { code, error: 'Unknown promo code' };
    }
  }

  const taxable = subtotal - discount;
  const vat = Math.round(taxable * VAT_RATE);
  return { room: room.slug, nights: nights.length, breakdown, subtotal, discount, promo, vat, total: taxable + vat };
}

/* ---------- availability ---------- */

function availableCount(room, checkin, checkout, excludeRef = null) {
  const n = store.bookings.all().filter((b) =>
    b.room === room.slug && b.status === 'confirmed' && b.ref !== excludeRef &&
    overlaps(checkin, checkout, new Date(b.checkin), new Date(b.checkout))).length;
  return room.inventory - n;
}

function bookedDates(room, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const all = store.bookings.all().filter((b) => b.room === room.slug && b.status === 'confirmed');
  const full = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const count = all.filter((b) => d >= new Date(b.checkin) && d < new Date(b.checkout)).length;
    if (count >= room.inventory) full.push(isoDay(d));
  }
  return full;
}

function publicRoom(r) {
  const { inventory, ...rest } = r;
  return rest;
}

function findBooking(ref, email) {
  const b = store.bookings.all().find((x) => x.ref === String(ref).toUpperCase());
  if (!b) return { error: 'Booking not found', status: 404 };
  if (email != null && email.toLowerCase() !== b.guest.email.toLowerCase()) {
    return { error: 'Email does not match this booking', status: 403 };
  }
  return { booking: b };
}

/* ---------- routes ---------- */

const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => {
    keys.push(k);
    return '([^/]+)';
  }) + '$');
  routes.push({ method, rx, keys, handler });
}

route('GET', '/api/rooms', (req, res, q) => {
  let rooms = store.rooms();
  if (q.get('type')) rooms = rooms.filter((r) => r.type === q.get('type'));
  if (+q.get('guests') > 0) rooms = rooms.filter((r) => r.capacity >= +q.get('guests'));
  if (+q.get('maxPrice') > 0) rooms = rooms.filter((r) => r.rate <= +q.get('maxPrice'));
  ok(res, rooms.map(publicRoom));
});

route('GET', '/api/rooms/:slug', (req, res, q, p) => {
  const room = store.rooms().find((r) => r.slug === p.slug);
  if (!room) return bad(res, 'Room not found', 404);
  ok(res, publicRoom(room));
});

route('GET', '/api/rooms/:slug/calendar', (req, res, q, p) => {
  const room = store.rooms().find((r) => r.slug === p.slug);
  if (!room) return bad(res, 'Room not found', 404);
  const month = q.get('month') || isoDay(new Date()).slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  if (!y || m < 1 || m > 12) return bad(res, 'Invalid month, expected YYYY-MM');
  ok(res, { month, fullDates: bookedDates(room, y, m) });
});

route('POST', '/api/availability', async (req, res) => {
  const body = await readBody(req);
  const checkin = parseDate(body.checkin), checkout = parseDate(body.checkout);
  if (!checkin || !checkout) return bad(res, 'checkin and checkout required (YYYY-MM-DD)');
  if (checkout <= checkin) return bad(res, 'check-out must be after check-in');
  const nights = eachNight(checkin, checkout);
  if (nights.length > MAX_NIGHTS) return bad(res, `Maximum stay is ${MAX_NIGHTS} nights`);
  const adults = Math.max(1, Math.min(10, +body.adults || 1));
  const children = Math.max(0, Math.min(9, +body.children || 0));

  const results = store.rooms()
    .filter((r) => r.capacity >= adults + children)
    .map((r) => ({ ...publicRoom(r),
      available: availableCount(r, checkin, checkout),
      quote: quote(r, checkin, checkout, adults, children, body.promoCode) }));
  ok(res, { checkin: body.checkin, checkout: body.checkout, adults, children, nights: nights.length, rooms: results });
});

route('POST', '/api/bookings', async (req, res) => {
  const b = await readBody(req);
  const room = store.rooms().find((r) => r.slug === b.room);
  if (!room) return bad(res, 'Unknown room');
  const checkin = parseDate(b.checkin), checkout = parseDate(b.checkout);
  if (!checkin || !checkout || checkout <= checkin) return bad(res, 'Invalid dates');
  if (checkin < new Date(isoDay(new Date()) + 'T00:00:00Z')) return bad(res, 'Check-in cannot be in the past');
  if (eachNight(checkin, checkout).length > MAX_NIGHTS) return bad(res, `Maximum stay is ${MAX_NIGHTS} nights`);

  const adults = Math.max(1, Math.min(10, +b.adults || 1));
  const children = Math.max(0, Math.min(9, +b.children || 0));
  if (adults + children > room.capacity) return bad(res, `This room sleeps ${room.capacity} maximum`);

  const g = b.guest || {};
  if (!g.firstName || !g.lastName) return bad(res, 'Guest first and last name required');
  if (!emailOK(g.email)) return bad(res, 'Valid email required');
  if (!phoneOK(g.phone)) return bad(res, 'Valid phone required');

  if (availableCount(room, checkin, checkout) < 1) {
    return bad(res, 'Sorry — this room just sold out for those dates', 409);
  }

  const q = quote(room, checkin, checkout, adults, children, b.promoCode);
  const booking = {
    ref: 'AR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    room: room.slug,
    checkin: b.checkin,
    checkout: b.checkout,
    adults, children,
    guest: {
      firstName: String(g.firstName).slice(0, 60),
      lastName: String(g.lastName).slice(0, 60),
      email: String(g.email).slice(0, 120),
      phone: String(g.phone).slice(0, 24),
      requests: String(g.requests || '').slice(0, 1000),
    },
    promoCode: q.promo && !q.promo.error ? q.promo.code : null,
    pricing: { subtotal: q.subtotal, discount: q.discount, vat: q.vat, total: q.total },
    status: 'confirmed',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.bookings.insert(booking);
  ok(res, { booking, room: publicRoom(room) });
});

route('GET', '/api/bookings/:ref', (req, res, q, p) => {
  const r = findBooking(p.ref, q.get('email'));
  if (r.error) return bad(res, r.error, r.status);
  const room = store.rooms().find((x) => x.slug === r.booking.room);
  ok(res, { booking: r.booking, room: room ? publicRoom(room) : null });
});

route('PATCH', '/api/bookings/:ref', async (req, res, q, p) => {
  const body = await readBody(req);
  const r = findBooking(p.ref, body.email);
  if (r.error) return bad(res, r.error, r.status);
  const b = r.booking;
  if (b.status !== 'confirmed') return bad(res, 'Only confirmed bookings can be modified');
  if (new Date(b.checkin) < new Date()) return bad(res, 'Past bookings cannot be modified');

  const room = store.rooms().find((x) => x.slug === b.room);
  const checkin = parseDate(body.checkin || b.checkin);
  const checkout = parseDate(body.checkout || b.checkout);
  if (!checkin || !checkout || checkout <= checkin) return bad(res, 'Invalid dates');
  if (eachNight(checkin, checkout).length > MAX_NIGHTS) return bad(res, `Maximum stay is ${MAX_NIGHTS} nights`);

  const adults = Math.max(1, Math.min(10, +body.adults || b.adults));
  const children = Math.max(0, Math.min(9, body.children == null ? b.children : +body.children));
  if (adults + children > room.capacity) return bad(res, `This room sleeps ${room.capacity} maximum`);
  if (availableCount(room, checkin, checkout, b.ref) < 1) {
    return bad(res, 'No availability for the new dates', 409);
  }

  const nq = quote(room, checkin, checkout, adults, children, b.promoCode);
  const patch = {
    checkin: isoDay(checkin), checkout: isoDay(checkout), adults, children,
    pricing: { subtotal: nq.subtotal, discount: nq.discount, vat: nq.vat, total: nq.total },
    modifiedAt: new Date().toISOString(),
  };
  store.bookings.update(b.ref, patch);
  ok(res, { booking: { ...b, ...patch }, room: publicRoom(room) });
});

route('DELETE', '/api/bookings/:ref', async (req, res, q, p) => {
  const body = await readBody(req);
  const r = findBooking(p.ref, body.email);
  if (r.error) return bad(res, r.error, r.status);
  const b = r.booking;
  if (new Date(b.checkin) < new Date()) return bad(res, 'Past bookings cannot be cancelled');
  store.bookings.update(b.ref, { status: 'cancelled', cancelledAt: new Date().toISOString() });
  ok(res, { booking: { ...b, status: 'cancelled' } });
});

/* Simulated M-Pesa STK push — in production this would call Safaricom Daraja. */
route('POST', '/api/payments/mpesa', async (req, res) => {
  const body = await readBody(req);
  const r = findBooking(body.ref, body.email);
  if (r.error) return bad(res, r.error, r.status);
  const b = r.booking;
  if (b.status !== 'confirmed') return bad(res, 'Booking is not active');
  if (b.paymentStatus === 'paid') return ok(res, { booking: b, message: 'Already paid' });
  if (!/^\+?[\d\s()-]{9,20}$/.test(body.phone || '')) return bad(res, 'Valid M-Pesa phone required');

  await new Promise((s) => setTimeout(s, 1400)); // simulate STK push round-trip
  const receipt = 'MPX' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const patch = {
    paymentStatus: 'paid',
    payment: { method: 'mpesa', phone: String(body.phone).slice(0, 24), receipt, paidAt: new Date().toISOString() },
  };
  store.bookings.update(b.ref, patch);
  ok(res, { booking: { ...b, ...patch }, message: `Payment received — receipt ${receipt}` });
});

route('POST', '/api/newsletter', async (req, res) => {
  const { email } = await readBody(req);
  if (!emailOK(email)) return bad(res, 'Valid email required');
  if (store.subscribers.all().find((s) => s.email.toLowerCase() === email.toLowerCase())) {
    return ok(res, { message: 'Already subscribed' });
  }
  store.subscribers.insert({ email, at: new Date().toISOString() });
  ok(res, { message: 'Subscribed — welcome to the ridge' });
});

route('POST', '/api/contact', async (req, res) => {
  const m = await readBody(req);
  if (!m.name || !m.message) return bad(res, 'Name and message required');
  if (!emailOK(m.email)) return bad(res, 'Valid email required');
  if (m.website) return ok(res, { message: 'Message received — we reply within 24 hours' }); // honeypot
  store.messages.insert({
    id: crypto.randomBytes(4).toString('hex'),
    name: String(m.name).slice(0, 80),
    email: String(m.email).slice(0, 120),
    subject: String(m.subject || 'General').slice(0, 120),
    message: String(m.message).slice(0, 3000),
    at: new Date().toISOString(),
  });
  ok(res, { message: 'Message received — we reply within 24 hours' });
});

route('GET', '/api/testimonials', (req, res) => ok(res, store.testimonials()));

route('GET', '/api/site', (req, res) => {
  const s = store.site();
  ok(res, { restaurants: s.restaurants, wellness: s.wellness, experiences: s.experiences,
    events: s.events, exchangeRates: s.exchangeRates });
});

route('GET', '/api/weather', (req, res) => {
  const icons = ['sun', 'sun-cloud', 'cloud', 'rain-sun', 'sun', 'storm', 'sun-cloud'];
  const out = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(Date.now() + i * 864e5);
    const seed = crypto.createHash('md5').update(isoDay(d)).digest()[0];
    out.push({ date: isoDay(d), high: 22 + (seed % 4), low: 11 + (seed % 3),
      icon: icons[seed % icons.length], rain: [10, 20, 40, 60][seed % 4] });
  }
  ok(res, { location: 'Kitale Highlands, Kenya', forecast: out });
});

route('GET', '/api/promo/:code', (req, res, q, p) => {
  const promo = store.site().promoCodes[p.code.toUpperCase()];
  if (!promo) return bad(res, 'Unknown promo code', 404);
  ok(res, { code: p.code.toUpperCase(), ...promo });
});

/* ---------- admin (Bearer ADMIN_TOKEN) ---------- */

route('GET', '/api/admin/overview', (req, res) => {
  if (!isAdmin(req)) return bad(res, 'Unauthorized', 401);
  const all = store.bookings.all();
  const active = all.filter((b) => b.status === 'confirmed');
  const today = new Date(isoDay(new Date()) + 'T00:00:00Z');
  const horizon = new Date(today); horizon.setUTCDate(horizon.getUTCDate() + 30);
  const totalInv = store.rooms().reduce((s, r) => s + r.inventory, 0);
  let nightsBooked = 0;
  for (const b of active) {
    const ci = new Date(b.checkin), co = new Date(b.checkout);
    nightsBooked += eachNight(ci > today ? ci : today, co < horizon ? co : horizon).length;
  }
  ok(res, {
    backend: store.backend,
    totalBookings: all.length,
    confirmed: active.length,
    cancelled: all.filter((b) => b.status === 'cancelled').length,
    paid: active.filter((b) => b.paymentStatus === 'paid').length,
    revenueKES: active.reduce((s, b) => s + b.pricing.total, 0),
    occupancyNext30d: totalInv ? Math.round((nightsBooked / (totalInv * 30)) * 100) : 0,
    subscribers: store.subscribers.all().length,
    messages: store.messages.all().length,
  });
});

route('GET', '/api/admin/bookings', (req, res) => {
  if (!isAdmin(req)) return bad(res, 'Unauthorized', 401);
  const all = store.bookings.all().sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  ok(res, all);
});

route('GET', '/api/admin/messages', (req, res) => {
  if (!isAdmin(req)) return bad(res, 'Unauthorized', 401);
  const all = store.messages.all().sort((x, y) => y.at.localeCompare(x.at));
  ok(res, all);
});

/* ---------- static files ---------- */

function serveStatic(req, res, pathname) {
  const file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      if (!path.extname(pathname)) { // SPA fallback
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store',
          ...SEC_HEADERS, 'Content-Security-Policy': CSP });
        return fs.createReadStream(path.join(PUBLIC, 'index.html')).pipe(res);
      }
      return send(res, 404, 'Not found', 'text/plain');
    }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const cache = ext === '.html' ? 'no-store'
      : ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? 'public, max-age=86400'
      : 'public, max-age=300';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache, ...SEC_HEADERS,
      ...(ext === '.html' ? { 'Content-Security-Policy': CSP } : {}) });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- handler ---------- */

async function handler(req, res) {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname;
  try { pathname = decodeURIComponent(u.pathname); } catch { return bad(res, 'Bad request'); }
  try {
    if (pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && rateLimited(req)) {
        return bad(res, 'Too many requests — slow down', 429);
      }
      for (const r of routes) {
        const m = pathname.match(r.rx);
        if (m && r.method === req.method) {
          const params = {};
          r.keys.forEach((k, i) => (params[k] = m[i + 1]));
          return await r.handler(req, res, u.searchParams, params);
        }
      }
      return bad(res, 'Not found', 404);
    }
    serveStatic(req, res, pathname);
  } catch (e) {
    bad(res, e.message || 'Server error', e.message === 'invalid JSON' ? 400 : 500);
  }
}

function createServer() {
  return http.createServer(handler);
}

module.exports = { handler, createServer,
  _internals: { quote, nightlyRate, overlaps, availableCount, eachNight, parseDate, isPeak } };
