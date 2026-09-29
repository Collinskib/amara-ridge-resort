'use strict';
/* Amara Ridge — staff admin dashboard (Bearer token auth). */

views.admin = () => `
  <section class="section" style="padding-top:calc(var(--nav-h) + 3rem);min-height:70vh">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Staff portal</span><h2>Admin dashboard</h2></div>
      <div id="adminRoot"></div>
    </div>
  </section>`;

views.admin.after = async () => {
  const root = $('#adminRoot');
  const token = sessionStorage.getItem('ar_admin') || '';

  if (!token) {
    root.innerHTML = `
      <div class="panel" style="max-width:440px">
        <p style="color:var(--ink-soft)">Enter the admin token (<code>ADMIN_TOKEN</code> env var; demo default <code>amara-demo-admin</code>).</p>
        <form id="adminLogin" class="form-grid">
          <div class="field full"><label>Token</label><input name="token" type="password" required autocomplete="off"></div>
          <div class="full"><button class="btn btn--gold">Sign in</button></div>
        </form>
      </div>`;
    $('#adminLogin').addEventListener('submit', (e) => {
      e.preventDefault();
      sessionStorage.setItem('ar_admin', e.target.token.value.trim());
      views.admin.after();
    });
    return;
  }

  const authed = (path) => api(path, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
  try {
    const [ov, bookings, messages] = await Promise.all([
      authed('/api/admin/overview'), authed('/api/admin/bookings'), authed('/api/admin/messages')]);
    const roomName = (s) => state.rooms.find((r) => r.slug === s)?.name || s;

    const csv = () => {
      const head = 'ref,room,checkin,checkout,adults,children,total_kes,status,payment,guest,email\n';
      const body = bookings.map((b) => [b.ref, b.room, b.checkin, b.checkout, b.adults, b.children,
        b.pricing.total, b.status, b.paymentStatus, `"${b.guest.firstName} ${b.guest.lastName}"`, b.guest.email].join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
      a.download = 'bookings.csv'; a.click(); URL.revokeObjectURL(a.href);
    };

    root.innerHTML = `
      <div class="stats" style="margin-bottom:1.8rem">
        <div class="stat"><strong>${ov.confirmed}</strong><span>Active bookings</span></div>
        <div class="stat"><strong>${money(ov.revenueKES)}</strong><span>Revenue booked</span></div>
        <div class="stat"><strong>${ov.occupancyNext30d}%</strong><span>Occupancy · 30d</span></div>
        <div class="stat"><strong>${ov.subscribers}</strong><span>Subscribers</span></div>
      </div>
      <div class="panel" style="margin-bottom:1.6rem">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.6rem;margin-bottom:1rem">
          <h3 style="margin:0">Bookings</h3>
          <div style="display:flex;gap:.6rem;align-items:center">
            <span class="badge badge--ok">store: ${ov.backend}</span>
            <button class="btn btn--ghost" id="csvBtn">Export CSV</button>
            <button class="btn btn--ghost" id="adminOut">Sign out</button>
          </div>
        </div>
        ${bookings.length ? `<div style="overflow-x:auto"><table class="admin-table">
          <tr><th>Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th>Paid</th></tr>
          ${bookings.map((b) => `<tr>
            <td><strong>${esc(b.ref)}</strong></td>
            <td>${esc(b.guest.firstName)} ${esc(b.guest.lastName)}<br><small style="color:var(--ink-soft)">${esc(b.guest.email)}</small></td>
            <td>${esc(roomName(b.room))}</td>
            <td>${fmtDate(b.checkin)} → ${fmtDate(b.checkout)}</td>
            <td>${money(b.pricing.total)}</td>
            <td><span class="badge ${b.status === 'confirmed' ? 'badge--ok' : 'badge--out'}">${esc(b.status)}</span></td>
            <td>${b.paymentStatus === 'paid' ? `<span class="badge badge--ok">${esc(b.payment?.receipt || 'paid')}</span>` : '<span class="badge badge--low">pending</span>'}</td>
          </tr>`).join('')}</table></div>` : '<p style="color:var(--ink-soft)">No bookings yet.</p>'}
      </div>
      <div class="panel">
        <h3 style="margin-top:0">Messages</h3>
        ${messages.length ? messages.map((m) => `
          <div class="treatment-row">
            <div><strong>${esc(m.subject)}</strong> — ${esc(m.name)} <em>(${esc(m.email)})</em><br>
            <span style="font-size:.88rem;color:var(--ink-soft)">${esc(m.message)}</span></div>
            <span class="dots"></span>
            <em style="white-space:nowrap">${new Date(m.at).toLocaleDateString()}</em>
          </div>`).join('') : '<p style="color:var(--ink-soft)">No messages.</p>'}
      </div>`;

    $('#csvBtn')?.addEventListener('click', csv);
    $('#adminOut').addEventListener('click', () => { sessionStorage.removeItem('ar_admin'); views.admin.after(); });
  } catch (e) {
    if (e.status === 401) {
      sessionStorage.removeItem('ar_admin');
      toast('Invalid token', true);
      return views.admin.after();
    }
    root.innerHTML = `<div class="empty">${icon('key')}<p>${esc(e.message)}</p></div>`;
  }
};
