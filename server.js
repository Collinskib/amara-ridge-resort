'use strict';
/*
 * Amara Ridge Resort — zero-dependency Node.js hotel site.
 * Static file server + JSON API (availability, bookings, contact, newsletter).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const VAT_RATE = 0.16;
const EXTRA_GUEST_FEE = 2500; // KES per night per guest over included capacity of 2
const MAX_NIGHTS = 30;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

/* ---------- helpers ---------- */

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
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

function parseDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const d = new Date(s + 'T00:00:00Z');
  return isNaN(d) ? null : d;
}

function isoDay(d) { return d.toISOString().slice(0, 10); }

function eachNight(checkin, checkout) {
  const nights = [];
  for (let d = new Date(checkin); d < checkout; d.setUTCDate(d.getUTCDate() + 1)) {
    nights.push(new Date(d));
  }
  return nights;
}

function overlaps(aIn, aOut, bIn, bOut) {
  return aIn < bOut && bIn < aOut;
}

/* ---------- pricing engine ---------- */

function nightlyRate(room, date) {
  let rate = room.rate;
  const dow = date.getUTCDay(); // 0 Sun … 6 Sat
  const m = date.getUTCMonth(); // 0-11
  const day = date.getUTCDate();
  if (dow === 5 || dow === 6) rate *= 1.15;              // weekend markup
  if ((m === 11 && day >= 20) || (m === 0 && day <= 5) || m === 6 || m === 7) rate *= 1.2; // peak season
  return Math.round(rate);
}

function quote(room, checkin, checkout, adults, children, promoCode) {
  const nights = eachNight(checkin, checkout);
  const breakdown = nights.map((d) => {
    const guests = adults + children;
    const extraGuests = Math.max(0, guests - 2);
    const base = nightlyRate(room, d);
    const extra = extraGuests * EXTRA_GUEST_FEE;
    return {
      date: isoDay(d),
      base,
      extraGuests: extra,
      total: base + extra,
      weekend: [5, 6].includes(d.getUTCDay()),
      peak: isPeak(d),
    };
  });
  const subtotal = breakdown.reduce((s, n) => s + n.total, 0);

  let discount = 0;
  let promo = null;
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
  return {
    room: room.slug,
    nights: nights.length,
    breakdown,
    subtotal,
    discount,
    promo,
    vat,
    total: taxable + vat,
  };
}

function isPeak(d) {
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return (m === 11 && day >= 20) || (m === 0 && day <= 5) || m === 6 || m === 7;
}

/* ---------- availability ---------- */

function availableCount(room, checkin, checkout) {
  const bookings = store.bookings().filter(
    (b) => b.room === room.slug && b.status === 'confirmed' &&
      overlaps(checkin, checkout, new Date(b.checkin), new Date(b.checkout))
  );
  return room.inventory - bookings.length;
}

function bookedDates(room, year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const full = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const count = store.bookings().filter(
      (b) => b.room === room.slug && b.status === 'confirmed' &&
        d >= new Date(b.checkin) && d < new Date(b.checkout)
    ).length;
    if (count >= room.inventory) full.push(isoDay(d));
  }
  return full;
}

/* ---------- API ---------- */

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
  if (!y || !m || m < 1 || m > 12) return bad(res, 'Invalid month, expected YYYY-MM');
  ok(res, { month, fullDates: bookedDates(room, y, m) });
});

route('POST', '/api/availability', async (req, res) => {
  const body = await readBody(req);
  const checkin = parseDate(body.checkin);
  const checkout = parseDate(body.checkout);
  if (!checkin || !checkout) return bad(res, 'checkin and checkout required (YYYY-MM-DD)');
  if (checkout <= checkin) return bad(res, 'check-out must be after check-in');
  const nights = eachNight(checkin, checkout);
  if (nights.length > MAX_NIGHTS) return bad(res, `Maximum stay is ${MAX_NIGHTS} nights`);
  const adults = Math.max(1, Math.min(10, +body.adults || 1));
  const children = Math.max(0, Math.min(9, +body.children || 0));

  const results = store.rooms()
    .filter((r) => r.capacity >= adults + children)
    .map((r) => ({
      ...publicRoom(r),
      available: availableCount(r, checkin, checkout),
      quote: quote(r, checkin, checkout, adults, children, body.promoCode),
    }));
  ok(res, { checkin: body.checkin, checkout: body.checkout, adults, children, nights: nights.length, rooms: results });
});

route('POST', '/api/bookings', async (req, res) => {
  const b = await readBody(req);
  const room = store.rooms().find((r) => r.slug === b.room);
  if (!room) return bad(res, 'Unknown room');
  const checkin = parseDate(b.checkin);
  const checkout = parseDate(b.checkout);
  if (!checkin || !checkout || checkout <= checkin) return bad(res, 'Invalid dates');
  if (checkin < new Date(isoDay(new Date()) + 'T00:00:00Z')) return bad(res, 'Check-in cannot be in the past');
  if (eachNight(checkin, checkout).length > MAX_NIGHTS) return bad(res, `Maximum stay is ${MAX_NIGHTS} nights`);

  const adults = Math.max(1, Math.min(10, +b.adults || 1));
  const children = Math.max(0, Math.min(9, +b.children || 0));
  if (adults + children > room.capacity) return bad(res, `This room sleeps ${room.capacity} maximum`);

  const g = b.guest || {};
  if (!g.firstName || !g.lastName) return bad(res, 'Guest first and last name required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email || '')) return bad(res, 'Valid email required');
  if (!/^\+?[\d\s()-]{7,20}$/.test(g.phone || '')) return bad(res, 'Valid phone required');

  if (availableCount(room, checkin, checkout) < 1) {
    return bad(res, 'Sorry — this room just sold out for those dates', 409);
  }

  const q = quote(room, checkin, checkout, adults, children, b.promoCode);
  const booking = {
    ref: 'AR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    room: room.slug,
    checkin: b.checkin,
    checkout: b.checkout,
    adults,
    children,
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
    createdAt: new Date().toISOString(),
  };
  const all = store.bookings();
  all.push(booking);
  store.saveBookings(all);
  ok(res, { booking, room: publicRoom(room) });
});

route('GET', '/api/bookings/:ref', (req, res, q, p) => {
  const b = store.bookings().find((x) => x.ref === p.ref.toUpperCase());
  if (!b) return bad(res, 'Booking not found', 404);
  if (q.get('email') && q.get('email').toLowerCase() !== b.guest.email.toLowerCase()) {
    return bad(res, 'Email does not match this booking', 403);
  }
  const room = store.rooms().find((r) => r.slug === b.room);
  ok(res, { booking: b, room: room ? publicRoom(room) : null });
});

route('DELETE', '/api/bookings/:ref', async (req, res, q, p) => {
  const body = await readBody(req);
  const all = store.bookings();
  const b = all.find((x) => x.ref === p.ref.toUpperCase());
  if (!b) return bad(res, 'Booking not found', 404);
  if ((body.email || '').toLowerCase() !== b.guest.email.toLowerCase()) {
    return bad(res, 'Email does not match this booking', 403);
  }
  if (new Date(b.checkin) < new Date()) return bad(res, 'Past bookings cannot be cancelled');
  b.status = 'cancelled';
  b.cancelledAt = new Date().toISOString();
  store.saveBookings(all);
  ok(res, { booking: b });
});

route('POST', '/api/newsletter', async (req, res) => {
  const { email } = await readBody(req);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) return bad(res, 'Valid email required');
  const subs = store.subscribers();
  if (subs.find((s) => s.email.toLowerCase() === email.toLowerCase())) {
    return ok(res, { message: 'Already subscribed' });
  }
  subs.push({ email, at: new Date().toISOString() });
  store.saveSubscribers(subs);
  ok(res, { message: 'Subscribed — welcome to the ridge' });
});

route('POST', '/api/contact', async (req, res) => {
  const m = await readBody(req);
  if (!m.name || !m.message) return bad(res, 'Name and message required');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email || '')) return bad(res, 'Valid email required');
  const msgs = store.messages();
  msgs.push({
    id: crypto.randomBytes(4).toString('hex'),
    name: String(m.name).slice(0, 80),
    email: String(m.email).slice(0, 120),
    subject: String(m.subject || 'General').slice(0, 120),
    message: String(m.message).slice(0, 3000),
    at: new Date().toISOString(),
  });
  store.saveMessages(msgs);
  ok(res, { message: 'Message received — we reply within 24 hours' });
});

route('GET', '/api/testimonials', (req, res) => ok(res, store.testimonials()));
route('GET', '/api/site', (req, res) => {
  const s = store.site();
  ok(res, {
    restaurants: s.restaurants,
    wellness: s.wellness,
    experiences: s.experiences,
    events: s.events,
    exchangeRates: s.exchangeRates,
  });
});

route('GET', '/api/weather', (req, res) => {
  // Deterministic 5-day "forecast" for the sample — seed by date.
  const icons = ['sun', 'sun-cloud', 'cloud', 'rain-sun', 'sun', 'storm', 'sun-cloud'];
  const out = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(Date.now() + i * 864e5);
    const seed = crypto.createHash('md5').update(isoDay(d)).digest()[0];
    out.push({
      date: isoDay(d),
      high: 22 + (seed % 4),
      low: 11 + (seed % 3),
      icon: icons[seed % icons.length],
      rain: [10, 20, 40, 60][seed % 4],
    });
  }
  ok(res, { location: 'Kitale Highlands, Kenya', forecast: out });
});

route('GET', '/api/promo/:code', (req, res, q, p) => {
  const promo = store.site().promoCodes[p.code.toUpperCase()];
  if (!promo) return bad(res, 'Unknown promo code', 404);
  ok(res, { code: p.code.toUpperCase(), ...promo });
});

function publicRoom(r) {
  const { inventory, ...rest } = r;
  return rest;
}

/* ---------- static files ---------- */

function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // SPA fallback: unknown extensionless paths serve index.html
      if (!path.extname(pathname)) {
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
        return fs.createReadStream(path.join(PUBLIC, 'index.html')).pipe(res);
      }
      return send(res, 404, 'Not found', 'text/plain');
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const ext = path.extname(file).toLowerCase();
    const cache = ext === '.html' ? 'no-store'
      : ext === '.jpg' || ext === '.png' || ext === '.webp' ? 'public, max-age=86400'
      : 'public, max-age=300';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- http server ---------- */

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(u.pathname);
  try {
    if (pathname.startsWith('/api/')) {
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
});

server.listen(PORT, () => {
  console.log(`\n  Amara Ridge Resort — http://localhost:${PORT}\n`);
});
