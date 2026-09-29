'use strict';
/* Amara Ridge — booking flow (search → room → details → confirm), manage booking, router. */

/* ================= BOOKING ================= */

views.book = (params) => {
  const q = params || {};
  const hasDates = q.checkin && q.checkout;
  const roomSlug = q.room;
  return `
  <section class="section" style="padding-top:calc(var(--nav-h) + 3rem);min-height:70vh">
    <div class="wrap">
      <div class="steps">
        <span class="${!roomSlug ? 'on' : ''}">1 · Dates &amp; room</span>
        <span class="${roomSlug && !q.done ? 'on' : ''}">2 · Guest details</span>
        <span>3 · Confirmation</span>
      </div>
      <div id="bookRoot"></div>
    </div>
  </section>`;
};

views.book.after = async (params) => {
  const q = params || {};
  if (q.checkin && q.checkout) return renderAvailability(q);
  if (q.room) return renderAvailability({ ...q, checkin: plusDays(todayISO(), 7), checkout: plusDays(todayISO(), 9), adults: 2, children: 0, preselect: q.room });
  return renderSearch();
};

function renderSearch() {
  $('#bookRoot').innerHTML = `
    <div class="panel" style="max-width:720px;margin:0 auto">
      <h2 style="margin-top:0">Check availability</h2>
      <form id="availForm" class="form-grid">
        ${bookbarFields({ checkin: plusDays(todayISO(), 7), checkout: plusDays(todayISO(), 9) }).replaceAll('bookbar__field', 'field')}
        <div class="field"><label>Promo code <span style="text-transform:none;letter-spacing:0">(optional)</span></label>
          <input name="promo" placeholder="e.g. AMARA10"></div>
        <div class="field" style="display:flex;align-items:end"><button class="btn btn--gold" style="width:100%">Search rooms</button></div>
      </form>
      <p style="font-size:.8rem;color:var(--ink-soft);margin:1rem 0 0">Try promo codes: <strong>AMARA10</strong>, <strong>STAY3</strong> (3+ nights), <strong>HONEYMOON</strong> (suites), <strong>WEEKDAY</strong></p>
    </div>`;
  $('#availForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkin.value || !f.checkout.value) return toast('Choose your dates', true);
    if (f.checkout.value <= f.checkin.value) return toast('Check-out must be after check-in', true);
    location.hash = `#/book?checkin=${f.checkin.value}&checkout=${f.checkout.value}&adults=${f.adults.value}&children=${f.children.value}${f.promo.value ? '&promo=' + encodeURIComponent(f.promo.value) : ''}`;
  });
}

async function renderAvailability(q) {
  $('#bookRoot').innerHTML = `
    <div class="avail-bar">
      <form id="refineForm" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:end;width:100%">
        ${bookbarFields(q)}
        <div class="bookbar__field"><label>Promo</label><input name="promo" value="${esc(q.promo || '')}" placeholder="Code"></div>
        <button class="btn btn--dark" type="submit">Update</button>
      </form>
    </div>
    <div id="availList"><div class="skel" style="height:170px;margin-bottom:1.2rem"></div><div class="skel" style="height:170px;margin-bottom:1.2rem"></div><div class="skel" style="height:170px"></div></div>`;

  $('#refineForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.checkout.value <= f.checkin.value) return toast('Check-out must be after check-in', true);
    location.hash = `#/book?checkin=${f.checkin.value}&checkout=${f.checkout.value}&adults=${f.adults.value}&children=${f.children.value}${f.promo.value ? '&promo=' + encodeURIComponent(f.promo.value) : ''}`;
  });

  let data;
  try {
    data = await api('/api/availability', { method: 'POST', body: {
      checkin: q.checkin, checkout: q.checkout, adults: +q.adults || 1, children: +q.children || 0, promoCode: q.promo } });
  } catch (err) {
    $('#availList').innerHTML = `<div class="empty">${icon('calendar')}<p>${esc(err.message)}</p></div>`;
    return;
  }

  const list = $('#availList');
  if (!data.rooms.length) {
    list.innerHTML = `<div class="empty">${icon('users')}<p>No rooms sleep ${data.adults + data.children} guests — try fewer guests or contact us for multiple rooms.</p></div>`;
    return;
  }

  list.innerHTML = `
    <p style="color:var(--ink-soft);margin:-0.6rem 0 1.4rem">
      ${data.nights} night${data.nights > 1 ? 's' : ''} · ${fmtDate(data.checkin)} → ${fmtDate(data.checkout)} · ${data.adults} adult${data.adults > 1 ? 's' : ''}${data.children ? `, ${data.children} child${data.children > 1 ? 'ren' : ''}` : ''}
      ${data.rooms[0]?.quote.promo && !data.rooms[0].quote.promo.error ? `· <span class="badge badge--ok">${esc(data.rooms[0].quote.promo.code)} applied</span>` : ''}
      ${data.rooms[0]?.quote.promo?.error ? `· <span class="badge badge--out">${esc(data.rooms[0].quote.promo.error)}</span>` : ''}
    </p>` +
    data.rooms.map((r) => {
      const out = r.available < 1;
      const low = !out && r.available <= 2;
      return `
      <div class="room-row">
        <div class="room-row__media"><img src="${r.photo}" alt="${esc(r.name)}" loading="lazy"></div>
        <div class="room-row__body">
          <h3 style="margin:0 0 .2rem"><a href="#/rooms/${r.slug}">${esc(r.name)}</a></h3>
          <div class="card__meta" style="margin:.3rem 0 .7rem">
            <span>${icon('ruler')} ${r.size} m²</span>
            <span>${icon('users')} Sleeps ${r.capacity}</span>
            <span>${icon('mountain')} ${esc(r.view)}</span>
          </div>
          <div class="chips">${r.amenities.slice(0, 5).map((a) => `<span class="chip">${icon(a)} ${AMENITY_LABELS[a] || a}</span>`).join('')}</div>
          <p style="margin:.7rem 0 0">${out ? '<span class="badge badge--out">Sold out</span>' : low ? `<span class="badge badge--low">Only ${r.available} left</span>` : '<span class="badge badge--ok">Available</span>'}</p>
        </div>
        <div class="room-row__price">
          ${r.quote.discount ? `<small><s>${money(r.quote.subtotal + r.quote.vat)}</s> · save ${money(r.quote.discount)}</small>` : `<small>${data.nights} night${data.nights > 1 ? 's' : ''} incl. VAT</small>`}
          <strong>${money(r.quote.total)}</strong>
          <small>total stay</small>
          <button class="btn ${out ? 'btn--ghost' : 'btn--gold'}" ${out ? 'disabled' : ''} data-room="${r.slug}">${out ? 'Sold out' : 'Select'}</button>
        </div>
      </div>`;
    }).join('');

  $$('#availList [data-room]').forEach((b) => b.addEventListener('click', () =>
    renderGuestForm({ ...q, room: b.dataset.room })));
  if (q.preselect) {
    const btn = $(`#availList [data-room="${q.preselect}"]`);
    if (btn && !btn.disabled) btn.click();
  }
}

async function renderGuestForm(q) {
  const room = state.rooms.find((r) => r.slug === q.room);
  if (!room) return toast('Room unavailable', true);
  // Re-fetch a fresh quote for the summary
  let quote;
  try {
    const d = await api('/api/availability', { method: 'POST', body: {
      checkin: q.checkin, checkout: q.checkout, adults: +q.adults || 1, children: +q.children || 0, promoCode: q.promo } });
    quote = d.rooms.find((r) => r.slug === q.room)?.quote;
  } catch {}
  if (!quote) return toast('Could not price this stay — try again', true);

  state.booking = { ...q, quote };

  $('#bookRoot').innerHTML = `
  <div class="book-layout">
    <div class="panel">
      <h2 style="margin-top:0">Guest details</h2>
      <form id="guestForm" class="form-grid">
        <div class="field"><label>First name</label><input name="firstName" required autocomplete="given-name"></div>
        <div class="field"><label>Last name</label><input name="lastName" required autocomplete="family-name"></div>
        <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="email"></div>
        <div class="field"><label>Phone</label><input name="phone" required placeholder="+254…" autocomplete="tel"></div>
        <div class="field full"><label>Special requests <span style="text-transform:none;letter-spacing:0">(optional)</span></label>
          <textarea name="requests" rows="3" placeholder="Anniversary, dietary needs, early arrival…"></textarea></div>
        <div class="full" style="display:flex;gap:.8rem;flex-wrap:wrap">
          <button class="btn btn--gold btn--lg" type="submit">Confirm booking</button>
          <button class="btn btn--ghost" type="button" id="backBtn">← Rooms</button>
        </div>
      </form>
      <p style="font-size:.8rem;color:var(--ink-soft);margin:1.2rem 0 0">Free cancellation until 48 hours before check-in. This is a demo — no payment is taken.</p>
    </div>
    <aside class="panel summary">
      <div class="summary__media"><img src="${room.photo}" alt="${esc(room.name)}"></div>
      <h3 style="margin:.2rem 0 .8rem">${esc(room.name)}</h3>
      <div class="summary-line"><span>Check-in</span><span>${fmtDate(q.checkin)}</span></div>
      <div class="summary-line"><span>Check-out</span><span>${fmtDate(q.checkout)}</span></div>
      <div class="summary-line"><span>Guests</span><span>${+q.adults + +q.children} (${q.adults} adult${+q.adults > 1 ? 's' : ''}${+q.children ? `, ${q.children} child${+q.children > 1 ? 'ren' : ''}` : ''})</span></div>
      <table class="night-table">
        ${quote.breakdown.map((n) => `<tr>
          <td>${fmtDate(n.date).slice(0, 11)}${n.weekend ? ' <span class="wk">wknd</span>' : ''}${n.peak ? ' <span class="wk">peak</span>' : ''}</td>
          <td>${money(n.total)}</td>
        </tr>`).join('')}
      </table>
      <div class="summary-line" style="margin-top:.6rem"><span>Subtotal</span><span>${money(quote.subtotal)}</span></div>
      ${quote.discount ? `<div class="summary-line"><span>Discount ${esc(quote.promo?.code || '')}</span><span style="color:#3f9e6a">− ${money(quote.discount)}</span></div>` : ''}
      <div class="summary-line"><span>VAT 16%</span><span>${money(quote.vat)}</span></div>
      <div class="summary-total"><span>Total</span><strong>${money(quote.total)}</strong></div>
    </aside>
  </div>`;

  $('#backBtn').addEventListener('click', () =>
    location.hash = `#/book?checkin=${q.checkin}&checkout=${q.checkout}&adults=${q.adults}&children=${q.children}${q.promo ? '&promo=' + encodeURIComponent(q.promo) : ''}`);

  $('#guestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, btn = $('button[type=submit]', f);
    let bad = false;
    ['firstName', 'lastName', 'email', 'phone'].forEach((n) => {
      const okv = f[n].value.trim().length > 0 && (n !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f[n].value));
      f[n].classList.toggle('invalid', !okv);
      if (!okv) bad = true;
    });
    if (bad) return toast('Please complete the highlighted fields', true);
    btn.disabled = true; btn.textContent = 'Confirming…';
    try {
      const r = await api('/api/bookings', { method: 'POST', body: {
        room: q.room, checkin: q.checkin, checkout: q.checkout,
        adults: +q.adults, children: +q.children, promoCode: q.promo || undefined,
        guest: { firstName: f.firstName.value.trim(), lastName: f.lastName.value.trim(),
          email: f.email.value.trim(), phone: f.phone.value.trim(), requests: f.requests.value.trim() },
      } });
      localStorage.setItem('ar_last_booking', JSON.stringify({ ref: r.booking.ref, email: r.booking.guest.email }));
      location.hash = `#/confirmation/${r.booking.ref}`;
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false; btn.textContent = 'Confirm booking';
    }
  });
}

/* ================= CONFIRMATION ================= */

views.confirmation = async (ref) => {
  const saved = JSON.parse(localStorage.getItem('ar_last_booking') || 'null');
  const email = saved?.ref === ref ? saved.email : '';
  let d;
  try { d = await api(`/api/bookings/${encodeURIComponent(ref)}${email ? '?email=' + encodeURIComponent(email) : ''}`); }
  catch (e) {
    return `<div class="notfound"><div>
      <h2>Booking not found</h2>
      <p style="color:var(--ink-soft)">${esc(e.message)}</p>
      <a class="btn btn--dark" href="#/manage">Look up a booking</a></div></div>`;
  }
  const b = d.booking, r = d.room;
  return `
  <section class="section" style="padding-top:calc(var(--nav-h) + 3rem)">
    <div class="wrap" style="max-width:720px">
      <div class="confirm-hero reveal in">
        <div class="check-ring"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></div>
        <span class="eyebrow eyebrow--center">${b.status === 'cancelled' ? 'Booking cancelled' : 'Booking confirmed'}</span>
        <div class="ref">${esc(b.ref)}</div>
        <p style="color:var(--ink-soft)">Keep this reference — you'll need it to manage your booking.</p>
        <button class="btn btn--ghost" id="copyRef">Copy reference</button>
      </div>
      <div class="panel" style="margin-top:2rem">
        ${r ? `<div class="summary__media"><img src="${r.photo}" alt="${esc(r.name)}"></div><h3>${esc(r.name)}</h3>` : ''}
        <div class="summary-line"><span>Payment</span><span>${b.paymentStatus === 'paid'
          ? `<span class="badge badge--ok">Paid · ${esc(b.payment?.receipt || '')}</span>`
          : '<span class="badge badge--low">Pending — pay on arrival or now</span>'}</span></div>
        <div class="summary-line"><span>Guest</span><span>${esc(b.guest.firstName)} ${esc(b.guest.lastName)}</span></div>
        <div class="summary-line"><span>Check-in</span><span>${fmtDate(b.checkin)} · from 14:00</span></div>
        <div class="summary-line"><span>Check-out</span><span>${fmtDate(b.checkout)} · by 11:00</span></div>
        <div class="summary-line"><span>Guests</span><span>${b.adults} adult${b.adults > 1 ? 's' : ''}${b.children ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}</span></div>
        ${b.guest.requests ? `<div class="summary-line"><span>Requests</span><span>${esc(b.guest.requests)}</span></div>` : ''}
        <div class="summary-line"><span>Subtotal</span><span>${money(b.pricing.subtotal)}</span></div>
        ${b.pricing.discount ? `<div class="summary-line"><span>Discount ${esc(b.promoCode || '')}</span><span style="color:#3f9e6a">− ${money(b.pricing.discount)}</span></div>` : ''}
        <div class="summary-line"><span>VAT 16%</span><span>${money(b.pricing.vat)}</span></div>
        <div class="summary-total"><span>Total</span><strong>${money(b.pricing.total)}</strong></div>
      </div>
      <div style="display:flex;gap:.8rem;margin-top:1.6rem;flex-wrap:wrap">
        ${b.status === 'confirmed' && b.paymentStatus !== 'paid' ? '<button class="btn btn--gold" id="mpesaBtn">Pay with M-Pesa</button>' : ''}
        <a class="btn btn--dark" href="#/">Back to home</a>
        <a class="btn btn--ghost" href="#/manage">Manage booking</a>
      </div>
    </div>
  </section>`;
};

views.confirmation.after = (ref) => {
  $('#copyRef')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(ref).then(() => toast('Reference copied'));
  });
  $('#mpesaBtn')?.addEventListener('click', () => mpesaFlow(ref));
};

/* Simulated M-Pesa STK push */
function mpesaFlow(ref) {
  const saved = JSON.parse(localStorage.getItem('ar_last_booking') || 'null');
  const email = saved?.ref === ref ? saved.email : '';
  openModal(`
    <h3 style="margin-top:0">Pay with M-Pesa</h3>
    <p style="color:var(--ink-soft);font-size:.92rem">Enter your M-Pesa number — you'll get an STK push to confirm with your PIN. <em>(Simulated — no money moves.)</em></p>
    <form id="mpesaForm" class="form-grid">
      <div class="field full"><label>M-Pesa phone</label><input name="phone" required placeholder="07XX XXX XXX" value=""></div>
      <div class="full"><button class="btn btn--gold" style="width:100%" id="mpesaGo">Send payment request</button></div>
    </form>`);
  $('#mpesaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#mpesaGo');
    btn.disabled = true; btn.textContent = 'Waiting for PIN entry…';
    try {
      const r = await api('/api/payments/mpesa', { method: 'POST', body: { ref, email, phone: e.target.phone.value } });
      closeModal();
      toast(r.message);
      render();
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Send payment request';
      toast(err.message, true);
    }
  });
}

/* ================= MANAGE BOOKING ================= */

views.manage = () => `
  <section class="section" style="padding-top:calc(var(--nav-h) + 3rem);min-height:70vh">
    <div class="wrap" style="max-width:640px">
      <h2>Manage your booking</h2>
      <p style="color:var(--ink-soft)">Enter your booking reference (e.g. AR-1A2B3C) and the email on the reservation.</p>
      <div class="panel">
        <form id="lookupForm" class="form-grid">
          <div class="field"><label>Booking reference</label><input name="ref" required placeholder="AR-______"></div>
          <div class="field"><label>Email</label><input type="email" name="email" required></div>
          <div class="full"><button class="btn btn--gold">Find booking</button></div>
        </form>
      </div>
      <div id="manageResult" style="margin-top:1.6rem"></div>
    </div>
  </section>`;

views.manage.after = () => {
  const saved = JSON.parse(localStorage.getItem('ar_last_booking') || 'null');
  if (saved) {
    $('#lookupForm').ref.value = saved.ref;
    $('#lookupForm').email.value = saved.email;
  }
  $('#lookupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const box = $('#manageResult');
    box.innerHTML = '<div class="skel" style="height:160px"></div>';
    try {
      const d = await api(`/api/bookings/${encodeURIComponent(f.ref.value.trim())}?email=${encodeURIComponent(f.email.value.trim())}`);
      const b = d.booking, r = d.room;
      const past = new Date(b.checkin) < new Date();
      box.innerHTML = `
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem">
            <h3 style="margin:0">${esc(r?.name || b.room)}</h3>
            <span class="badge ${b.status === 'confirmed' ? 'badge--ok' : 'badge--out'}">${esc(b.status)}</span>
          </div>
          <div class="summary-line"><span>Reference</span><span>${esc(b.ref)}</span></div>
          <div class="summary-line"><span>Dates</span><span>${fmtDate(b.checkin)} → ${fmtDate(b.checkout)}</span></div>
          <div class="summary-line"><span>Guests</span><span>${b.adults + b.children}</span></div>
          <div class="summary-line"><span>Payment</span><span>${b.paymentStatus === 'paid'
            ? `<span class="badge badge--ok">Paid · ${esc(b.payment?.receipt || '')}</span>`
            : '<span class="badge badge--low">Pending</span>'}</span></div>
          <div class="summary-total"><span>Total paid on arrival</span><strong>${money(b.pricing.total)}</strong></div>
          ${b.status === 'confirmed' && !past ? `
            <div style="display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap">
              ${b.paymentStatus !== 'paid' ? '<button class="btn btn--gold" id="payBtn">Pay with M-Pesa</button>' : ''}
              <button class="btn btn--ghost" id="modBtn">Change dates</button>
              <button class="btn btn--ghost" id="cancelBtn" style="color:#b05252;border-color:#b05252">Cancel booking</button>
            </div>
            <div id="modBox" style="display:none;margin-top:1rem">
              <form id="modForm" class="form-grid">
                ${bookbarFields({ checkin: b.checkin, checkout: b.checkout, adults: b.adults, children: b.children }).replaceAll('bookbar__field', 'field')}
                <div class="field" style="display:flex;align-items:end"><button class="btn btn--dark">Re-quote &amp; save</button></div>
              </form>
            </div>` : ''}
        </div>`;

      $('#payBtn')?.addEventListener('click', () => mpesaFlow(b.ref));
      $('#modBtn')?.addEventListener('click', () => {
        const box = $('#modBox');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      });
      $('#modForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        if (f.checkout.value <= f.checkin.value) return toast('Check-out must be after check-in', true);
        try {
          await api(`/api/bookings/${encodeURIComponent(b.ref)}`, { method: 'PATCH', body: {
            email: f.email?.value || $('#lookupForm').email.value.trim(),
            checkin: f.checkin.value, checkout: f.checkout.value,
            adults: +f.adults.value, children: +f.children.value } });
          toast('Booking updated — new total applied');
          $('#lookupForm').dispatchEvent(new Event('submit', { cancelable: true }));
        } catch (err) { toast(err.message, true); }
      });
      $('#cancelBtn')?.addEventListener('click', () => {
        openModal(`
          <h3 style="margin-top:0">Cancel booking ${esc(b.ref)}?</h3>
          <p style="color:var(--ink-soft)">This releases the room immediately and cannot be undone.</p>
          <div style="display:flex;gap:.7rem;flex-wrap:wrap">
            <button class="btn btn--dark" id="confirmCancel" style="background:#8a3030">Yes, cancel it</button>
            <button class="btn btn--ghost" id="keepIt">Keep my booking</button>
          </div>`);
        $('#keepIt').addEventListener('click', closeModal);
        $('#confirmCancel').addEventListener('click', async () => {
          try {
            await api(`/api/bookings/${encodeURIComponent(b.ref)}`, { method: 'DELETE', body: { email: f.email.value.trim() } });
            closeModal();
            toast('Booking cancelled');
            $('#lookupForm').dispatchEvent(new Event('submit', { cancelable: true }));
          } catch (err) { toast(err.message, true); }
        });
      });
    } catch (err) {
      box.innerHTML = `<div class="empty">${icon('key')}<p>${esc(err.message)}</p></div>`;
    }
  });
};

/* ================= ROUTER ================= */

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [pathPart, queryPart] = raw.split('?');
  const segs = pathPart.split('/').filter(Boolean);
  const params = {};
  if (queryPart) for (const kv of queryPart.split('&')) {
    const [k, v] = kv.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return { segs, params };
}

async function render() {
  const { segs, params } = parseHash();
  const app = $('#app');
  const page = segs[0] || 'home';
  setNav(location.hash || '#/');
  window.scrollTo(0, 0);

  let view, arg;
  switch (page) {
    case 'home': view = views.home; break;
    case 'rooms': view = segs[1] ? views.roomDetail : views.rooms; arg = segs[1]; break;
    case 'dining': view = views.dining; break;
    case 'wellness': view = views.wellness; break;
    case 'experiences': view = views.experiences; break;
    case 'events': view = views.events; break;
    case 'gallery': view = views.gallery; break;
    case 'contact': view = views.contact; arg = params; break;
    case 'book': view = views.book; arg = params; break;
    case 'confirmation': view = views.confirmation; arg = segs[1]; break;
    case 'manage': view = views.manage; break;
    case 'admin': view = views.admin; break;
    default:
      app.innerHTML = `<div class="notfound"><div><h2>Page not found</h2><a class="btn btn--dark" href="#/">Back home</a></div></div>`;
      return;
  }

  try {
    app.innerHTML = await view(arg);
  } catch (e) {
    app.innerHTML = `<div class="notfound"><div><h2>Something went wrong</h2><p style="color:var(--ink-soft)">${esc(e.message)}</p></div></div>`;
    return;
  }
  observeReveals();
  if (view.after) {
    try { await view.after(arg); } catch (e) { /* non-fatal */ }
  }
}

/* ================= BOOT ================= */

(async function boot() {
  initShell();
  addEventListener('hashchange', render);
  try {
    const [rooms, site] = await Promise.all([api('/api/rooms'), api('/api/site')]);
    state.rooms = rooms;
    state.site = site;
  } catch {
    $('#app').innerHTML = `<div class="notfound"><div><h2>Cannot reach the resort API</h2><p style="color:var(--ink-soft)">Is the server running?</p></div></div>`;
    return;
  }
  render();
})();
