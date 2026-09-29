'use strict';
/* Amara Ridge — page views. Requires core.js. */

const views = {};

/* ================= HOME ================= */

views.home = async () => {
  const feat = ['deluxe-hill-view', 'honeymoon-suite', 'lakeside-villa']
    .map((s) => state.rooms.find((r) => r.slug === s)).filter(Boolean);
  return `
  <section class="hero">
    <div class="hero__scene"><img src="/img/hero.jpg" alt="The resort at dusk"></div>
    <div class="hero__inner">
      <span class="eyebrow eyebrow--center" style="color:var(--gold-soft)">Kitale · Kenya</span>
      <h1>A <em>colonial</em> retreat<br>beneath Mount Elgon</h1>
      <p class="hero__sub">Fifty-six rooms, suites and villas wrapped in manicured gardens on the ridge — a heated pool, destination dining and sunsets over the Cherangani Hills.</p>
      <div class="hero__cta">
        <a class="btn btn--gold btn--lg" href="#/book">Reserve your stay</a>
        <a class="btn btn--ghost btn--lg" href="#/rooms">Explore rooms</a>
      </div>
    </div>
    <div class="hero__scroll" aria-hidden="true"></div>
    <form class="bookbar" id="bookbar">
      ${bookbarFields({ checkin: plusDays(todayISO(), 7), checkout: plusDays(todayISO(), 9) })}
      <button class="btn btn--dark" type="submit">Check availability</button>
    </form>
  </section>

  <section class="section">
    <div class="wrap split">
      <div class="reveal">
        <span class="eyebrow">Welcome to the ridge</span>
        <h2>English bones, equatorial soul</h2>
        <p class="lead">Amara Ridge is built in the English colonial manner — deep verandas, tall shutters, pitched roofs — then softened with contemporary Kenyan warmth. The result is a resort that feels both storied and effortless.</p>
        <ul class="tick-list">
          <li>56 rooms, suites, cottages &amp; a private villa</li>
          <li>Heated rooftop pool, gym, steam room, sauna &amp; spa</li>
          <li>Three dining venues, fine to barefoot</li>
          <li>Weddings &amp; conferences for up to 500 guests</li>
        </ul>
        <a class="link-more" href="#/gallery">Take the visual tour →</a>
      </div>
      <div class="split__media reveal"><img src="/img/intro.jpg" alt="Resort gardens and veranda" loading="lazy"></div>
    </div>
  </section>

  <section class="section section--sunk">
    <div class="wrap">
      <div class="section-head section-head--center reveal">
        <span class="eyebrow eyebrow--center">Stay with us</span>
        <h2>Signature accommodation</h2>
      </div>
      <div class="grid grid--3">${feat.map(roomCard).join('')}</div>
      <p style="text-align:center;margin-top:2.4rem"><a class="btn btn--dark" href="#/rooms">View all rooms &amp; suites</a></p>
    </div>
  </section>

  <section class="section section--green">
    <div class="wrap">
      <div class="stats reveal">
        <div class="stat"><strong>56</strong><span>Rooms &amp; villas</span></div>
        <div class="stat"><strong>3</strong><span>Restaurants &amp; bars</span></div>
        <div class="stat"><strong>29°C</strong><span>Heated rooftop pool</span></div>
        <div class="stat"><strong>500</strong><span>Event capacity</span></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Beyond the resort</span>
        <h2>Days on the ridge &amp; beyond</h2>
        <p class="lead">Mount Elgon safaris, swamp walks and forest treks — our concierge builds each itinerary around you.</p>
      </div>
      <div class="grid grid--3" id="homeExp"></div>
      <p style="margin-top:2rem"><a class="link-more" href="#/experiences">All experiences →</a></p>
    </div>
  </section>

  <section class="section section--sunk">
    <div class="wrap">
      <div class="section-head section-head--center reveal">
        <span class="eyebrow eyebrow--center">Guest book</span>
        <h2>Words from the veranda</h2>
      </div>
      <div class="quote-band" id="quotes"><div class="skel" style="height:150px"></div></div>
    </div>
  </section>

  <section class="section section--green" style="text-align:center">
    <div class="wrap">
      <span class="eyebrow eyebrow--center">Ready when you are</span>
      <h2>Your ridge is waiting</h2>
      <p class="lead" style="margin-inline:auto;text-align:center">Book direct for our best rates, flexible cancellation and a welcome drink on arrival.</p>
      <a class="btn btn--gold btn--lg" href="#/book">Check availability</a>
    </div>
  </section>`;
};

views.home.after = async () => {
  $('#bookbar').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkin.value || !f.checkout.value) return toast('Pick your dates first', true);
    if (f.checkout.value <= f.checkin.value) return toast('Check-out must be after check-in', true);
    location.hash = `#/book?checkin=${f.checkin.value}&checkout=${f.checkout.value}&adults=${f.adults.value}&children=${f.children.value}`;
  });

  try {
    const s = await api('/api/site');
    $('#homeExp').innerHTML = s.experiences.slice(0, 3).map(expTile).join('');
    observeReveals();
  } catch {}

  try {
    const t = await api('/api/testimonials');
    let i = 0;
    const draw = () => {
      const q = t[i % t.length];
      $('#quotes').innerHTML = `
        <div class="quote-slide">
          <div class="stars">${'★'.repeat(q.rating)}${'☆'.repeat(5 - q.rating)}</div>
          <p class="quote-text">“${esc(q.text)}”</p>
          <div class="quote-who">${esc(q.name)} · ${esc(q.location)} — ${esc(q.room)}</div>
          <div class="quote-nav">${t.map((_, n) =>
            `<button aria-label="Show quote ${n + 1}" class="${n === i % t.length ? 'on' : ''}" data-i="${n}"></button>`).join('')}</div>
        </div>`;
      $$('.quote-nav button', $('#quotes')).forEach((b) =>
        b.addEventListener('click', () => { i = +b.dataset.i; draw(); }));
    };
    draw();
    const timer = setInterval(() => {
      if (!document.contains($('#quotes'))) return clearInterval(timer);
      if (!document.hidden) { i++; draw(); }
    }, 7000);
  } catch { $('#quotes').innerHTML = ''; }
};

function expTile(x) {
  return `
  <article class="card reveal">
    <div class="card__media" style="aspect-ratio:16/8">
      <img src="${x.photo}" alt="${esc(x.name)}" loading="lazy">
      <span class="card__tag">${esc(x.category)}</span>
    </div>
    <div class="card__body">
      <h3 style="font-size:1.25rem">${esc(x.name)}</h3>
      <p style="color:var(--ink-soft);font-size:.9rem">${esc(x.blurb)}</p>
      <div class="card__meta">
        <span>${icon('calendar')} ${esc(x.duration)}</span>
        <span>${icon('star')} ${money(x.price)} pp</span>
      </div>
    </div>
  </article>`;
}

/* ================= ROOMS ================= */

views.rooms = () => `
  ${pageHero('Rooms &amp; Suites', 'Seven ways to stay — from garden rooms to a private ridge-top villa. Every rate includes breakfast.', 'Rooms', '/img/rooms/deluxe-hill-view.jpg')}
  <section class="section">
    <div class="wrap">
      <div class="filters">
        <div class="field"><label>Type</label>
          <div class="pill-group" id="typePills">
            ${['', 'room', 'suite', 'cottage', 'villa'].map((t) =>
              `<button class="pill ${t === '' ? 'active' : ''}" data-t="${t}">${t || 'All'}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label>Sleeps at least</label>
          <select id="fGuests"><option value="0">Any</option>${[2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Max nightly rate</label>
          <div class="filters__price"><input type="range" id="fPrice" min="14000" max="100000" step="1000" value="100000"><span id="fPriceVal">Any</span></div>
        </div>
        <div class="field"><label>Sort by</label>
          <select id="fSort"><option value="rate">Price ↑</option><option value="rate-desc">Price ↓</option><option value="size">Size</option><option value="capacity">Capacity</option></select>
        </div>
      </div>
      <div class="grid grid--3" id="roomGrid"></div>
    </div>
  </section>`;

views.rooms.after = () => {
  const grid = $('#roomGrid');
  const draw = () => {
    const type = $('.pill.active', $('#typePills'))?.dataset.t || '';
    const guests = +$('#fGuests').value;
    const max = +$('#fPrice').value;
    const sort = $('#fSort').value;
    $('#fPriceVal').textContent = max >= 100000 ? 'Any' : `≤ ${money(max)}`;
    const list = state.rooms
      .filter((r) => (!type || r.type === type) && r.capacity >= guests && (max >= 100000 || r.rate <= max))
      .sort((a, b) =>
        sort === 'rate-desc' ? b.rate - a.rate :
        sort === 'size' ? b.size - a.size :
        sort === 'capacity' ? b.capacity - a.capacity : a.rate - b.rate);
    grid.innerHTML = list.length ? list.map(roomCard).join('')
      : `<div class="empty" style="grid-column:1/-1">${icon('bed')}<p>No rooms match — try widening the filters.</p></div>`;
    $$('#roomGrid .reveal').forEach((el) => el.classList.add('in'));
  };
  $$('#typePills .pill').forEach((p) => p.addEventListener('click', () => {
    $$('#typePills .pill').forEach((x) => x.classList.remove('active'));
    p.classList.add('active'); draw();
  }));
  ['fGuests', 'fPrice', 'fSort'].forEach((id) => $('#' + id).addEventListener('input', draw));
  draw();
};

/* ================= ROOM DETAIL ================= */

views.roomDetail = async (slug) => {
  let r;
  try { r = await api(`/api/rooms/${slug}`); }
  catch { return `<div class="notfound"><div><h2>Room not found</h2><a class="btn btn--dark" href="#/rooms">All rooms</a></div></div>`; }
  const others = state.rooms.filter((x) => x.slug !== slug).slice(0, 3);
  return `
  ${pageHero(esc(r.name), esc(r.tagline), `<a href="#/rooms">Rooms</a> · ${esc(r.name)}`, r.photo)}
  <section class="section">
    <div class="wrap room-detail">
      <div>
        <div class="card__media" style="border-radius:var(--radius-lg);overflow:hidden"><img src="${r.photo}" alt="${esc(r.name)}"><span class="card__tag">${esc(r.type)}</span></div>
        <dl class="spec-list">
          <div><dt>Size</dt><dd>${r.size} m²</dd></div>
          <div><dt>Sleeps</dt><dd>${r.capacity} guests</dd></div>
          <div><dt>Bedding</dt><dd>${esc(r.beds)}</dd></div>
          <div><dt>View</dt><dd>${esc(r.view)}</dd></div>
        </dl>
        <div class="chips">${r.amenities.map((a) => `<span class="chip">${icon(a)} ${AMENITY_LABELS[a] || a}</span>`).join('')}</div>
        <h3 style="margin-top:2rem">Availability</h3>
        <div class="cal" id="roomCal"><div class="skel" style="height:280px;width:300px"></div></div>
      </div>
      <div>
        <p class="lead">${esc(r.description)}</p>
        <ul class="feat-list">${r.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        <div class="panel">
          <div class="card__price" style="margin-top:0"><strong>${money(r.rate)}</strong><span>/ night · bed &amp; breakfast</span></div>
          <p style="font-size:.82rem;color:var(--ink-soft)">Weekend &amp; peak-season rates apply · 16% VAT at booking · free cancellation to 48h before</p>
          <a class="btn btn--gold btn--lg" style="width:100%" href="#/book?room=${r.slug}">Book this room</a>
        </div>
      </div>
    </div>
  </section>
  <section class="section section--sunk">
    <div class="wrap">
      <h3 style="margin-bottom:1.6rem">Also consider</h3>
      <div class="grid grid--3">${others.map(roomCard).join('')}</div>
    </div>
  </section>`;
};

views.roomDetail.after = (slug) => buildCalendar($('#roomCal'), slug);

async function buildCalendar(el, slug) {
  let cursor = todayISO().slice(0, 7);
  const render = async () => {
    let data;
    try { data = await api(`/api/rooms/${slug}/calendar?month=${cursor}`); }
    catch { el.innerHTML = '<p style="color:var(--ink-soft)">Calendar unavailable</p>'; return; }
    const [y, m] = cursor.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const blanks = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
    let rows = '', cells = '';
    for (let i = 0; i < blanks; i++) cells += '<td></td>';
    for (let d = 1; d <= days; d++) {
      const iso = `${cursor}-${String(d).padStart(2, '0')}`;
      const cls = iso < todayISO() ? 'past' : data.fullDates.includes(iso) ? 'full' : '';
      cells += `<td class="${cls}">${d}</td>`;
    }
    // split into weeks of 7 <td>
    const tds = cells.match(/<td.*?<\/td>/g) || [];
    for (let i = 0; i < tds.length; i += 7) rows += `<tr>${tds.slice(i, i + 7).join('')}</tr>`;
    const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    el.innerHTML = `
      <div class="cal__head">
        <button data-m="-1" aria-label="Previous month">‹</button>
        <strong>${monthName}</strong>
        <button data-m="1" aria-label="Next month">›</button>
      </div>
      <table><tr><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th><th>Su</th></tr>${rows}</table>
      <p style="font-size:.72rem;color:var(--ink-soft);margin-top:.5rem"><span style="color:#b05252">Struck-through</span> = fully booked</p>`;
    $$('.cal__head button', el).forEach((b) => b.addEventListener('click', () => {
      const d = new Date(Date.UTC(y, m - 1 + +b.dataset.m, 1));
      cursor = d.toISOString().slice(0, 7);
      render();
    }));
  };
  render();
}

/* ================= DINING ================= */

views.dining = async () => {
  const s = await api('/api/site');
  return `
  ${pageHero('Dining', 'Three venues, one philosophy: farm-to-table freshness with colonial-era ceremony.', 'Dining', '/img/dining/cedar.jpg')}
  <section class="section">
    <div class="wrap grid" style="gap:2rem">
      ${s.restaurants.map((r) => `
        <article class="card rest-card reveal">
          <div class="card__media"><img src="${r.photo}" alt="${esc(r.name)}" loading="lazy"></div>
          <div class="card__body" style="padding:1.6rem 1.8rem">
            <div class="card__meta" style="margin-top:0">
              <span>${icon('calendar')} ${esc(r.hours)}</span>
              <span>${icon('pin')} ${esc(r.setting)}</span>
              <span>${icon('star')} ${esc(r.cuisine)}</span>
            </div>
            <h3>${esc(r.name)}</h3>
            <p style="color:var(--ink-soft);font-size:.95rem">${esc(r.blurb)}</p>
            <div class="menu-table">
              ${r.menu.map((m) => `<h4>${esc(m.course)}</h4><ul>${m.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
            </div>
          </div>
        </article>`).join('')}
    </div>
  </section>`;
};

/* ================= WELLNESS ================= */

views.wellness = async () => {
  const s = await api('/api/site');
  const w = s.wellness;
  return `
  ${pageHero('Health Club &amp; Spa', esc(w.intro), 'Wellness', '/img/wellness/pool.jpg')}
  <section class="section">
    <div class="wrap grid grid--4">
      ${w.facilities.map((f) => `
        <div class="card reveal">
          <div class="card__media" style="aspect-ratio:4/3"><img src="${f.photo}" alt="${esc(f.name)}" loading="lazy"></div>
          <div class="card__body" style="text-align:center;padding:1.2rem 1rem 1.4rem">
            <h3 style="font-size:1.15rem">${esc(f.name)}</h3>
            <p style="font-size:.85rem;color:var(--ink-soft);margin:0">${esc(f.detail)}</p>
          </div>
        </div>`).join('')}
    </div>
  </section>
  <section class="section section--sunk">
    <div class="wrap split" style="align-items:start">
      <div class="reveal">
        <span class="eyebrow">The Acacia Spa</span>
        <h2>Treatment menu</h2>
        ${w.treatments.map((t) => `
          <div class="treatment-row">
            <div><strong>${esc(t.name)}</strong><br><em>${esc(t.duration)}</em></div>
            <span class="dots"></span>
            <span class="price">${money(t.price)}</span>
          </div>`).join('')}
        <p style="margin-top:1.4rem"><a class="btn btn--dark" href="#/contact?subject=${encodeURIComponent('Spa booking')}">Reserve a treatment</a></p>
      </div>
      <div class="reveal">
        <div class="panel">
          <h3 style="margin-top:0">Membership &amp; access</h3>
          <p style="font-size:.95rem;color:var(--ink-soft)">All facilities complimentary for resident guests. Non-residents welcome:</p>
          <div class="treatment-row"><div><strong>Day pass</strong><br><em>Pool · gym · steam · sauna</em></div><span class="dots"></span><span class="price">${money(500)}</span></div>
          <div class="treatment-row"><div><strong>Monthly</strong><br><em>Full access, all facilities</em></div><span class="dots"></span><span class="price">${money(5000)}</span></div>
          <h3 style="margin-top:1.6rem">5-day ridge forecast</h3>
          <div id="wx"><div class="skel" style="height:70px"></div></div>
        </div>
      </div>
    </div>
  </section>`;
};

views.wellness.after = async () => {
  try {
    const w = await api('/api/weather');
    $('#wx').innerHTML = `<div style="display:flex;gap:.55rem">
      ${w.forecast.map((d) => `
        <div style="flex:1;text-align:center;border:1px solid var(--line);border-radius:10px;padding:.6rem .2rem">
          <div style="font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft)">${new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}</div>
          <div style="font-family:var(--serif);font-size:1.35rem;color:var(--gold-deep)">${d.high}°</div>
          <div style="font-size:.7rem;color:var(--ink-soft)">/${d.low}° · ${d.rain}%</div>
        </div>`).join('')}
    </div><p style="font-size:.72rem;color:var(--ink-soft);margin:.6rem 0 0">${esc(w.location)} — the pool stays heated regardless.</p>`;
  } catch { $('#wx').innerHTML = ''; }
};

/* ================= EXPERIENCES ================= */

views.experiences = async () => {
  const s = await api('/api/site');
  const cats = [...new Set(s.experiences.map((x) => x.category))];
  return `
  ${pageHero('Experiences', 'Tours, treks and sundowners arranged by our concierge desk.', 'Experiences', '/img/exp/cruise.jpg')}
  <section class="section"><div class="wrap">
    <div class="pill-group" id="expPills" style="margin-bottom:2rem">
      <button class="pill active" data-c="">All</button>
      ${cats.map((c) => `<button class="pill" data-c="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <div class="grid grid--3" id="expGrid"></div>
  </div></section>`;
};

views.experiences.after = async () => {
  const s = await api('/api/site');
  const grid = $('#expGrid');
  const draw = (cat = '') => {
    grid.innerHTML = s.experiences.filter((x) => !cat || x.category === cat).map((x) => `
      ${expTile(x).replace('</article>', `<a class="btn btn--ghost" style="width:calc(100% - 3rem);margin:0 1.5rem 1.4rem" href="#/contact?subject=${encodeURIComponent('Experience: ' + x.name)}">Enquire</a></article>`)}
    `).join('');
    $$('#expGrid .reveal').forEach((el) => el.classList.add('in'));
  };
  draw();
  $$('#expPills .pill').forEach((p) => p.addEventListener('click', () => {
    $$('#expPills .pill').forEach((x) => x.classList.remove('active'));
    p.classList.add('active'); draw(p.dataset.c);
  }));
};

/* ================= EVENTS ================= */

views.events = async () => {
  const s = await api('/api/site');
  const e = s.events;
  return `
  ${pageHero('Weddings &amp; Events', esc(e.intro), 'Events', '/img/wedding.jpg')}
  <section class="section"><div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Venues</span><h2>Spaces for 10 to 500</h2></div>
    <div class="grid grid--4">
      ${e.venues.map((v) => `<div class="card reveal"><div class="card__body" style="text-align:center">
        <h3 style="font-size:1.2rem">${esc(v.name)}</h3>
        <p style="margin:0"><strong style="font-family:var(--serif);font-size:1.5rem;color:var(--gold-deep)">${esc(v.capacity)}</strong><br>
        <span style="font-size:.82rem;color:var(--ink-soft)">${esc(v.use)}</span></p></div></div>`).join('')}
    </div>
  </div></section>
  <section class="section section--sunk"><div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Wedding packages</span><h2>Three ways to say “I do”</h2></div>
    <div class="grid grid--3">
      ${e.weddingPackages.map((p, i) => `
        <div class="card reveal" style="${i === 1 ? 'outline:2px solid var(--gold);outline-offset:-2px' : ''}">
          <div class="card__body">
            ${i === 1 ? '<span class="badge badge--ok" style="margin-bottom:.6rem">Most popular</span>' : ''}
            <h3>${esc(p.name)}</h3>
            <p style="font-family:var(--serif);font-size:1.35rem;color:var(--gold-deep)">${esc(p.price)}</p>
            <ul class="feat-list">${p.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            <a class="btn ${i === 1 ? 'btn--gold' : 'btn--ghost'}" style="width:100%" href="#/contact?subject=${encodeURIComponent('Wedding: ' + p.name + ' package')}">Request proposal</a>
          </div>
        </div>`).join('')}
    </div>
  </div></section>`;
};

/* ================= GALLERY ================= */

views.gallery = () => `
  ${pageHero('Gallery', 'Rooms, gardens, hills and table — the resort in pictures.', 'Gallery', '/img/gal/lake.jpg')}
  <section class="section"><div class="wrap">
    <div class="pill-group" id="galPills" style="margin-bottom:2rem">
      ${['', 'rooms', 'grounds', 'dining', 'lake'].map((c) =>
        `<button class="pill ${c === '' ? 'active' : ''}" data-c="${c}">${c === 'lake' ? 'Hills & views' : c || 'All'}</button>`).join('')}
    </div>
    <div class="gallery-grid" id="galGrid"></div>
  </div></section>`;

views.gallery.after = () => {
  const tiles = [
    ...state.rooms.map((r, i) => ({ cat: 'rooms', cap: r.name, img: r.photo, wide: i % 4 === 0 })),
    { cat: 'grounds', cap: 'The manicured gardens', img: '/img/gal/gardens.jpg', wide: true },
    { cat: 'grounds', cap: 'Rooftop pool at dusk', img: '/img/gal/pool.jpg', wide: false },
    { cat: 'grounds', cap: 'The veranda walk', img: '/img/gal/veranda.jpg', wide: false },
    { cat: 'dining', cap: 'The Cedar Restaurant', img: '/img/gal/dining.jpg', wide: false },
    { cat: 'dining', cap: 'Mizizi pool bar & grill', img: '/img/dining/mizizi.jpg', wide: false },
    { cat: 'lake', cap: 'Dawn over the highlands', img: '/img/gal/lake.jpg', wide: true },
    { cat: 'lake', cap: 'The ridge at golden hour', img: '/img/gal/ridge.jpg', wide: false },
  ];
  const grid = $('#galGrid');
  const draw = (cat = '') => {
    const list = tiles.filter((t) => !cat || t.cat === cat);
    grid.innerHTML = list.map((t, i) => `
      <figure class="gal-tile ${t.wide ? 'gal-tile--wide' : ''}" data-i="${i}">
        <img src="${t.img}" alt="${esc(t.cap)}" loading="lazy"><figcaption>${esc(t.cap)}</figcaption>
      </figure>`).join('');
    $$('.gal-tile', grid).forEach((el) => el.addEventListener('click', () => {
      const t = list[+el.dataset.i];
      openLightbox(`<img src="${t.img}" alt="${esc(t.cap)}">`, t.cap);
    }));
  };
  draw();
  $$('#galPills .pill').forEach((p) => p.addEventListener('click', () => {
    $$('#galPills .pill').forEach((x) => x.classList.remove('active'));
    p.classList.add('active'); draw(p.dataset.c);
  }));
};

/* ================= CONTACT ================= */

views.contact = (params) => `
  ${pageHero('Contact', 'Questions, proposals, special occasions — write to us, we reply within a day.', 'Contact', '/img/intro.jpg')}
  <section class="section">
    <div class="wrap split" style="align-items:start">
      <div class="panel reveal">
        <h3 style="margin-top:0">Send a message</h3>
        <form id="contactForm" class="form-grid">
          <div class="field"><label>Name</label><input name="name" required></div>
          <div class="field"><label>Email</label><input type="email" name="email" required></div>
          <div class="field full"><label>Subject</label><input name="subject" value="${esc(params?.subject || 'General enquiry')}"></div>
          <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;height:0;width:0;opacity:0">
          <div class="field full"><label>Message</label><textarea name="message" required placeholder="Tell us about your stay…"></textarea></div>
          <div class="full"><button class="btn btn--gold" type="submit">Send message</button></div>
        </form>
      </div>
      <div class="reveal">
        <div class="panel" style="margin-bottom:1.4rem">
          <h3 style="margin-top:0">Find us</h3>
          <p><span style="color:var(--gold-deep)">${icon('pin')}</span> Ridge Road, Off Kitale–Kapenguria Rd, Kitale, Kenya</p>
          <p><span style="color:var(--gold-deep)">${icon('phone')}</span> <a href="tel:+254700000000">+254 700 000 000</a></p>
          <p><span style="color:var(--gold-deep)">${icon('mail')}</span> <a href="mailto:stay@amararidge.example">stay@amararidge.example</a></p>
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Good to know</h3>
          <ul class="tick-list" style="margin-bottom:0">
            <li>Check-in from 14:00 · check-out by 11:00</li>
            <li>Transfers on request (Kitale airstrip 20 min · Eldoret 90 min)</li>
            <li>Children welcome; cots free</li>
            <li>Best rates guaranteed when booking direct</li>
          </ul>
        </div>
      </div>
    </div>
  </section>`;

views.contact.after = () => {
  $('#contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, btn = $('button', f);
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await api('/api/contact', { method: 'POST', body: {
        name: f.name.value, email: f.email.value, subject: f.subject.value, message: f.message.value } });
      toast(r.message);
      f.reset();
    } catch (err) { toast(err.message, true); }
    btn.disabled = false; btn.textContent = 'Send message';
  });
};
