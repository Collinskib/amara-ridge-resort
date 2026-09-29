'use strict';
/* Amara Ridge — core helpers, state, shell. Requires icons.js first. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  rooms: [],
  site: null,
  currency: localStorage.getItem('ar_currency') || 'KES',
  booking: {}, // in-flight booking draft
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Error ${res.status}`), { status: res.status });
  return data;
}

const RATES = () => state.site?.exchangeRates || { KES: 1 };
const SYMBOLS = { KES: 'KES ', USD: '$', EUR: '€', GBP: '£' };

function money(kes) {
  const cur = state.currency;
  const val = Math.round(kes * (RATES()[cur] || 1));
  return SYMBOLS[cur] + val.toLocaleString();
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

/* ---------- toast ---------- */
function toast(msg, err) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('toast--err', !!err);
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 3600);
}

/* ---------- modal & lightbox ---------- */
function openModal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal__box"><button class="modal__close" data-close>×</button>${html}</div>`;
  m.hidden = false;
  $('[data-close]', m).addEventListener('click', closeModal);
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
function openLightbox(svg, caption) {
  const lb = $('#lightbox');
  lb.innerHTML = `<div><div class="lightbox__img">${svg}</div><div class="lightbox__cap">${esc(caption)}</div></div>`;
  lb.hidden = false;
}
function closeLightbox() { const lb = $('#lightbox'); lb.hidden = true; lb.innerHTML = ''; }

/* ---------- scroll reveal ---------- */
let _revealObs;
function observeReveals() {
  _revealObs?.disconnect();
  _revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); _revealObs.unobserve(en.target); }
    });
  }, { threshold: 0.1 });
  $$('.reveal').forEach((el) => _revealObs.observe(el));
}

/* ---------- shared template chunks ---------- */

function pageHero(title, sub, crumb, img = '/img/hero.jpg') {
  return `
  <section class="page-hero">
    <div class="hero__scene"><img src="${img}" alt="" loading="eager"></div>
    <div class="wrap">
      <div class="crumbs"><a href="#/">Home</a> · ${crumb}</div>
      <h1>${title}</h1>
      <p>${sub}</p>
    </div>
  </section>`;
}

function bookbarFields(d = {}) {
  const opt = (name, vals, cur, def) =>
    `<select name="${name}">${vals.map((v) =>
      `<option value="${v}" ${+cur === v || (!cur && v === def) ? 'selected' : ''}>${v}</option>`).join('')}</select>`;
  return `
  <div class="bookbar__field"><label>Check-in</label>
    <input type="date" name="checkin" value="${esc(d.checkin || '')}" min="${todayISO()}"></div>
  <div class="bookbar__field"><label>Check-out</label>
    <input type="date" name="checkout" value="${esc(d.checkout || '')}" min="${plusDays(todayISO(), 1)}"></div>
  <div class="bookbar__field"><label>Adults</label>${opt('adults', [1, 2, 3, 4, 5, 6], d.adults, 2)}</div>
  <div class="bookbar__field"><label>Children</label>${opt('children', [0, 1, 2, 3, 4], d.children, 0)}</div>`;
}

function roomCard(r) {
  return `
  <article class="card reveal">
    <a class="card__media" href="#/rooms/${r.slug}"><img src="${r.photo}" alt="${esc(r.name)}" loading="lazy"><span class="card__tag">${esc(r.type)}</span></a>
    <div class="card__body">
      <h3><a href="#/rooms/${r.slug}">${esc(r.name)}</a></h3>
      <p style="color:var(--ink-soft);font-size:.92rem;margin:0">${esc(r.tagline)}</p>
      <div class="card__meta">
        <span>${icon('ruler')} ${r.size} m²</span>
        <span>${icon('users')} Sleeps ${r.capacity}</span>
        <span>${icon('mountain')} ${esc(r.view)}</span>
      </div>
      <div class="card__price"><strong>${money(r.rate)}</strong><span>/ night · B&amp;B</span></div>
      <div class="card__actions">
        <a class="btn btn--ghost" href="#/rooms/${r.slug}">Details</a>
        <a class="btn btn--gold" href="#/book?room=${r.slug}">Book</a>
      </div>
    </div>
  </article>`;
}

/* ---------- shell ---------- */

function initShell() {
  $('#year').textContent = new Date().getFullYear();
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('nav--solid',
    window.scrollY > 40 || nav.dataset.solid === '1');
  addEventListener('scroll', onScroll, { passive: true });
  nav._sync = onScroll;

  document.documentElement.dataset.theme = localStorage.getItem('ar_theme') || 'light';
  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ar_theme', next);
  });

  const cur = $('#currencySelect');
  cur.value = state.currency;
  cur.addEventListener('change', () => {
    state.currency = cur.value;
    localStorage.setItem('ar_currency', cur.value);
    render();
    toast(`Prices now shown in ${cur.value}`);
  });

  $('#burger').addEventListener('click', () => {
    $('#navLinks').classList.toggle('open');
    $('#burger').classList.toggle('open');
  });
  $('#navLinks').addEventListener('click', () => {
    $('#navLinks').classList.remove('open');
    $('#burger').classList.remove('open');
  });

  $('#newsletterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const r = await api('/api/newsletter', { method: 'POST', body: { email: e.target.email.value.trim() } });
      toast(r.message);
      e.target.reset();
    } catch (err) { toast(err.message, true); }
  });

  api('/api/weather').then((w) => {
    const f = w.forecast[0];
    $('#footerWeather').textContent = `Now on the ridge: ${f.high}°C · ${f.rain}% chance of rain`;
  }).catch(() => {});

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeLightbox(); }
  });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
}

function setNav(hash) {
  const seg = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  $$('.nav__links a').forEach((a) =>
    a.classList.toggle('active', a.getAttribute('href') === `#/${seg}`));
  // Pages with a dark hero keep the nav transparent; form pages need solid nav.
  const darkHero = !['book', 'manage', 'confirmation'].includes(seg);
  $('#nav').dataset.solid = darkHero ? '0' : '1';
  $('#nav').classList.toggle('nav--solid', !darkHero || window.scrollY > 40);
}
