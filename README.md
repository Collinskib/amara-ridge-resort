# Amara Ridge Resort

A full-stack luxury hotel booking site — **zero npm dependencies**, pure Node.js + vanilla JS.
Inspired by real boutique resorts in western Kenya; set beneath Mount Elgon in Kitale.

![Node](https://img.shields.io/badge/node-%E2%89%A520-339933) ![Dependencies](https://img.shields.io/badge/deps-0-brightgreen) ![Tests](https://img.shields.io/badge/tests-node%3Atest-blue)

## Features

**Guest side**
- Hash-routed SPA: rooms, dining, wellness, experiences, weddings/events, gallery, contact
- Live availability search with per-night price breakdown
- **Pricing engine** — weekend +15%, peak season +20%, extra-guest fees, promo codes (`AMARA10`, `STAY3`, `HONEYMOON`, `WEEKDAY`), 16% VAT
- Full booking lifecycle: create → confirmation (reference `AR-XXXXXX`) → lookup → **modify dates** → **simulated M-Pesa payment** → cancel
- Per-room availability calendar, currency switcher (KES/USD/EUR/GBP), dark/light theme
- PWA: installable, service worker asset caching

**Staff side**
- `#/admin` dashboard — occupancy, revenue, bookings table, messages inbox, CSV export
- Bearer-token gated API (`ADMIN_TOKEN` env var)

**Engineering**
- `node:test` suite: pricing unit tests + full API integration tests
- Storage abstraction: SQLite (`node:sqlite`) when available, JSON files otherwise — `/tmp` on serverless
- Security headers + CSP, contact-form honeypot, naive per-IP rate limiting, path-traversal guard
- GitHub Actions CI, Dockerfile, Vercel-ready (`vercel.json` + `api/` functions)

## Run it

```bash
npm start          # → http://localhost:3000
npm run dev        # --watch mode
npm test           # node:test suite
```

Docker:

```bash
docker build -t amara-ridge .
docker run -p 3000:3000 amara-ridge
```

## Deploy to Vercel

```bash
vercel        # or import the GitHub repo in the Vercel dashboard
```

Static assets come from `public/`; every `/api/*` request hits `api/[...path].js` which
shares the same handler as the local server. On Vercel the writable store uses `/tmp`
(ephemeral — bookings reset on cold start; fine for a demo, swap in a real DB for prod).

Set a custom admin token in the Vercel dashboard: `ADMIN_TOKEN=...` (default `amara-demo-admin`).

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/rooms` | List rooms (`?type=&guests=&maxPrice=` filters) |
| GET | `/api/rooms/:slug` | Room detail |
| GET | `/api/rooms/:slug/calendar?month=YYYY-MM` | Fully-booked dates |
| POST | `/api/availability` | `{checkin, checkout, adults, children, promoCode}` → quotes |
| POST | `/api/bookings` | Create booking → `{ref}` |
| GET | `/api/bookings/:ref?email=` | Lookup (email-gated) |
| PATCH | `/api/bookings/:ref` | Modify dates/guests, re-quoted |
| DELETE | `/api/bookings/:ref` | Cancel |
| POST | `/api/payments/mpesa` | Simulated STK push → marks booking paid |
| POST | `/api/newsletter` · `/api/contact` | Subscribe / message (honeypot) |
| GET | `/api/site` `/api/testimonials` `/api/weather` `/api/promo/:code` | Content |
| GET | `/api/admin/overview` `/api/admin/bookings` `/api/admin/messages` | Bearer-gated |

## Structure

```
server.js            local entrypoint (thin)
api/                 Vercel serverless entrypoints — same handler
lib/app.js           router, pricing engine, availability, bookings, admin, static
lib/store.js         storage abstraction — sqlite → /tmp → json fallback
data/                catalogue JSON (rooms, site content) + runtime data
public/              SPA: index.html, css, js (icons/core/views/admin/book), img/, PWA
test/                node:test unit + integration suites
```

## Roadmap / ideas

- Email confirmations (stub queue)
- Multi-room bookings / cart
- Swahili locale toggle
- Real payment provider integration (Daraja) behind an env flag

Demo project — no real payments are processed and contact details are fictional.
Photos: Unsplash.
