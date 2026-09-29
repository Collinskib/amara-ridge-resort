/* Amara Ridge — SVG icon set & generated scenery (no external images needed) */
'use strict';

const ICONS = {
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9 21h6"/>',
  coffee: '<path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2"/><path d="M8 5c0-1 .8-1.5.8-2.5M12 5c0-1 .8-1.5.8-2.5"/>',
  safe: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M8.5 12H7M17 12h-1.5"/>',
  ac: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M12 3l-2 2.5M12 3l2 2.5M12 21l-2-2.5M12 21l2-2.5"/>',
  breakfast: '<path d="M4 18h16M5 18v-1a7 7 0 0 1 14 0v1"/><path d="M12 10V8"/><circle cx="12" cy="7" r="0.9"/>',
  minibar: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 10h12"/><circle cx="15" cy="6.5" r="0.9"/><path d="M9 14h5M9 17h5"/>',
  balcony: '<path d="M4 20V9a8 8 0 0 1 16 0v11"/><path d="M4 14h16M8 14v6M12 14v6M16 14v6"/>',
  bathtub: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 12V5a2 2 0 0 1 4 0"/><path d="M8 19l-1 2M17 19l1 2"/>',
  lounge: '<path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/>',
  butler: '<path d="M4 18h16M6 18v-1a6 6 0 0 1 12 0v1"/><path d="M12 11V9"/><circle cx="12" cy="8" r="0.9"/>',
  pool: '<path d="M2 16c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/><path d="M2 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/><circle cx="16.5" cy="6" r="2.4"/><path d="M13.5 12.5l3.5-4"/>',
  kitchenette: '<path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18"/><path d="M17 3c-1.8 0-3 2.2-3 5 0 2.6 1 4 3 4v9M17 3v4"/>',
  workspace: '<rect x="4" y="4" width="16" height="10" rx="1.5"/><path d="M2 18h20"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M15.5 5a3.2 3.2 0 0 1 0 6M18 15c2 .8 3.2 2.4 3.2 5"/>',
  ruler: '<rect x="3" y="9" width="18" height="7" rx="1"/><path d="M7 9v3M11 9v4M15 9v3"/>',
  mountain: '<path d="M3 19L10 6l4 7 2.5-3.5L21 19z"/>',
  bed: '<path d="M3 18V8M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7.5" cy="10.5" r="1.5"/>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19c3-6 7-9 12-11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  crown: '<path d="M4 18h16M4 18l-1.2-9L8 12l4-6.5L16 12l5.2-3L20 18"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.4A3.8 3.8 0 0 1 12 7.1a3.8 3.8 0 0 1 7 3.5C19 15.6 12 20 12 20z"/>',
  home: '<path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
  star: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.1-5.6-3-5.6 3 1.2-6.1L3 9.6l6.3-.8z"/>',
  boat: '<path d="M4 15l2 4h12l2-4H4z"/><path d="M12 15V4"/><path d="M12 4l6.5 10H12zM12 4l-5.5 10H12z"/>',
  island: '<path d="M12 11V5M12 5c2-1.6 4.2-1.6 6-1-1.4 1-2.4 2.6-2 4.5M12 5C10 3.4 7.8 3.4 6 4c1.4 1 2.4 2.6 2 4.5"/><path d="M7 11a3 3 0 0 1 5-2 3 3 0 0 1 5 2"/><path d="M4 16c2 1.4 5.5 2 8 2s6-.6 8-2M3 19.5c2.5 1.4 5.8 2 9 2s6.5-.6 9-2"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M13 7.5l-2.5 4.5 2 3v5.5M10.5 12l-3 2.5M13 7.5l3 2.5 3 1M12.5 15L10 21"/>',
  tree: '<path d="M12 3L7.5 10h2.8L6.5 15h3L6 21h12l-3.5-6h3L13.7 10h2.8z"/><path d="M12 21v-4"/>',
  bike: '<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-7h5M10 10L8 6.5h2.5M15 10l-1.5 7M6 17l6.5-3.5"/>',
  rock: '<path d="M8 20L4 9l6-5 8 3 3 6-5 7z"/>',
  gym: '<path d="M7 8v8M4 10v4M17 8v8M20 10v4M7 12h10"/>',
  spa: '<path d="M12 21c-4-2.5-6-6-4.5-9.5 1.5.8 3 .3 3.5-1.5.5 1.8 2 2.3 3.5 1.5C16 15 14.5 18.5 12 21z"/><path d="M4 20.5c1.5-1.2 3-1.8 4.5-1.8M20 20.5c-1.5-1.2-3-1.8-4.5-1.8"/>',
  steam: '<path d="M5 13h14a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 5 13z"/><path d="M9 9.5c0-1.5 1.2-1.5 1.2-3M13 9.5c0-1.5 1.2-1.5 1.2-3M17 9.5c0-1.5 1.2-1.5 1.2-3"/><path d="M4 21h16"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/><circle cx="8" cy="13" r="0.9"/><circle cx="12" cy="13" r="0.9"/><circle cx="16" cy="13" r="0.9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l2.5 2.5M13.5 8.5L16 11"/>',
};

function icon(name, cls = '', size = 18) {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;
}

const AMENITY_LABELS = {
  wifi: 'Free Wi-Fi', tv: 'HD Smart TV', coffee: 'Tea & coffee', safe: 'Laptop safe',
  ac: 'Climate control', breakfast: 'Breakfast included', minibar: 'Minibar',
  balcony: 'Private balcony', bathtub: 'Soaking tub', lounge: 'Lounge area',
  butler: 'Butler service', pool: 'Private pool', kitchenette: 'Kitchenette',
  workspace: 'Work desk',
};

/* ---------- generated scenery (kept as offline fallback art) ---------- */

let _uid = 0;

/**
 * Stylised layered-hill scene. Unused while real photos are served,
 * but handy as a fallback: <img src="..." onerror="this.outerHTML=scene(...)">
 * g: [colorA, colorB], iconName: big watermark icon.
 */
function scene(g, iconName, variant = 'card') {
  const id = 'sg' + (++_uid);
  return `
  <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Decorative landscape">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[0]}"/>
      </linearGradient>
      <radialGradient id="${id}s" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="400" height="250" fill="url(#${id})"/>
    <circle cx="318" cy="52" r="46" fill="url(#${id}s)" opacity="0.7"/>
    <circle cx="318" cy="52" r="22" fill="#f7e3ad" opacity="0.95"/>
    <path class="drift-slow" d="M0 138 C70 102 140 92 200 118 S330 158 400 118 V250 H0 Z" fill="#ffffff" opacity="0.10"/>
    <path class="drift-med" d="M0 168 C80 138 160 132 240 158 S360 192 400 172 V250 H0 Z" fill="#0a1a14" opacity="0.14"/>
    <path d="M0 206 C90 182 200 186 290 204 S370 226 400 212 V250 H0 Z" fill="#081510" opacity="0.28"/>
    <g stroke="#ffffff" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round">
      <path d="M40 62 q5 -5 10 0 q5 -5 10 0"/>
      <path d="M74 80 q4 -4 8 0 q4 -4 8 0"/>
    </g>
    <g transform="translate(58 108) scale(4.2)" stroke="rgba(255,255,255,0.9)" fill="none" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
      ${ICONS[iconName] || ICONS.leaf}
    </g>
  </svg>`;
}

/** Full-bleed hero scene: dusk over the ridge, lake below. */
function heroScene() {
  const id = 'hs' + (++_uid);
  return `
  <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1f23"/>
        <stop offset="0.45" stop-color="#16423e"/>
        <stop offset="0.78" stop-color="#3d6b52"/>
        <stop offset="1" stop-color="#8a7a3e"/>
      </linearGradient>
      <radialGradient id="${id}sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffe9b0" stop-opacity="0.95"/>
        <stop offset="0.35" stop-color="#f0c96a" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#f0c96a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${id}lake" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2f5d50"/><stop offset="1" stop-color="#0c221c"/>
      </linearGradient>
      <linearGradient id="${id}veil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#08150f" stop-opacity="0.55"/>
        <stop offset="0.35" stop-color="#08150f" stop-opacity="0.15"/>
        <stop offset="0.7" stop-color="#08150f" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#08150f" stop-opacity="0.72"/>
      </linearGradient>
    </defs>

    <rect width="1440" height="900" fill="url(#${id}sky)"/>

    <g class="sun-glow">
      <circle cx="1020" cy="560" r="330" fill="url(#${id}sun)"/>
      <circle cx="1020" cy="560" r="86" fill="#f6dc96"/>
      <circle cx="1020" cy="560" r="86" fill="#fff" opacity="0.25"/>
    </g>

    <g fill="#e8f2e6" opacity="0.5">
      <circle cx="140" cy="90" r="1.6"/><circle cx="320" cy="60" r="1.2"/><circle cx="500" cy="120" r="1.4"/>
      <circle cx="700" cy="70" r="1.2"/><circle cx="880" cy="110" r="1.6"/><circle cx="1200" cy="80" r="1.3"/>
      <circle cx="1330" cy="150" r="1.5"/><circle cx="60" cy="200" r="1.1"/>
    </g>

    <path class="drift-slow" d="M0 520 C180 420 320 400 520 470 S860 560 1080 480 S1360 430 1440 470 V900 H0 Z" fill="#1a4a44" opacity="0.75"/>
    <path class="drift-med" d="M0 600 C200 510 400 500 620 560 S1000 640 1220 570 S1400 540 1440 570 V900 H0 Z" fill="#123832"/>

    <path d="M0 690 C160 640 380 620 600 665 S980 730 1200 680 S1400 655 1440 675 V900 H0 Z" fill="url(#${id}lake)"/>
    <g stroke="#e8c56a" stroke-width="2" fill="none" opacity="0.28" stroke-linecap="round">
      <path d="M760 740 q60 -8 140 0 t160 6"/>
      <path d="M820 775 q55 -6 120 0 t140 5"/>
      <path d="M880 810 q50 -5 105 0 t115 4"/>
      <path d="M180 770 q55 -6 120 0 t140 5" opacity="0.5"/>
      <path d="M240 810 q50 -5 105 0 t115 4" opacity="0.4"/>
    </g>

    <path d="M0 830 C220 790 460 780 720 815 S1200 870 1440 825 V900 H0 Z" fill="#0a1f1a"/>
    <g fill="#08160f">
      <path d="M120 830 l10 -55 10 55 z M145 835 l8 -40 8 40 z"/>
      <path d="M1280 838 l10 -60 10 60 z M1308 842 l8 -44 8 44 z"/>
    </g>
    <g stroke="#f2ecdb" stroke-width="2.4" fill="none" opacity="0.65" stroke-linecap="round">
      <path d="M250 210 q9 -9 18 0 q9 -9 18 0"/>
      <path d="M310 240 q7 -7 14 0 q7 -7 14 0"/>
      <path d="M190 265 q6 -6 12 0 q6 -6 12 0"/>
    </g>

    <rect width="1440" height="900" fill="url(#${id}veil)"/>
  </svg>`;
}
