'use strict';
/*
 * Storage layer.
 * - Static catalogue (rooms, site content, testimonials): bundled JSON, read-only.
 * - Mutable collections (bookings, subscribers, messages): SQLite via node:sqlite
 *   when available, otherwise JSON files. On Vercel (read-only bundled FS) the
 *   mutable store lives under /tmp — ephemeral, fine for a demo deploy.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ON_VERCEL = !!process.env.VERCEL;
const RUNTIME_DIR = ON_VERCEL ? path.join('/tmp', 'amara-data') : DATA_DIR;

function readJSON(file, fallback, dir = DATA_DIR) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data, dir = RUNTIME_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, file + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, path.join(dir, file));
}

/* Seed /tmp with the bundled mutable collections on cold start */
if (ON_VERCEL) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  for (const f of ['bookings.json', 'subscribers.json', 'messages.json']) {
    const dest = path.join(RUNTIME_DIR, f);
    if (!fs.existsSync(dest)) {
      const src = path.join(DATA_DIR, f);
      fs.writeFileSync(dest, fs.existsSync(src) ? fs.readFileSync(src) : '[]');
    }
  }
}

/* ---------- SQLite backend (preferred) ---------- */

function sqliteStore() {
  const { DatabaseSync } = require('node:sqlite'); // throws if unavailable
  const dbFile = ON_VERCEL ? path.join('/tmp', 'amara.db') : path.join(DATA_DIR, 'app.db');
  const db = new DatabaseSync(dbFile);
  db.exec(`CREATE TABLE IF NOT EXISTS docs (
    collection TEXT NOT NULL,
    doc TEXT NOT NULL
  )`);

  const seedIfEmpty = (name) => {
    const n = db.prepare('SELECT COUNT(*) c FROM docs WHERE collection=?').get(name).c;
    if (n === 0) {
      const ins = db.prepare('INSERT INTO docs (collection, doc) VALUES (?, ?)');
      for (const d of readJSON(name + '.json', [])) ins.run(name, JSON.stringify(d));
    }
  };
  ['bookings', 'subscribers', 'messages'].forEach(seedIfEmpty);

  return (name, key) => ({
    all: () => db.prepare('SELECT doc FROM docs WHERE collection=?').all(name).map((r) => JSON.parse(r.doc)),
    insert: (doc) => db.prepare('INSERT INTO docs (collection, doc) VALUES (?, ?)').run(name, JSON.stringify(doc)),
    update: (keyVal, patch) => {
      const rows = db.prepare('SELECT rowid, doc FROM docs WHERE collection=?').all(name);
      for (const row of rows) {
        const d = JSON.parse(row.doc);
        if (d[key] === keyVal) {
          db.prepare('UPDATE docs SET doc=? WHERE rowid=?').run(JSON.stringify({ ...d, ...patch }), row.rowid);
          return true;
        }
      }
      return false;
    },
  });
}

/* ---------- JSON-file fallback ---------- */

function jsonStore() {
  return (name, key) => ({
    all: () => readJSON(name + '.json', [], RUNTIME_DIR),
    insert: (doc) => {
      const all = readJSON(name + '.json', [], RUNTIME_DIR);
      all.push(doc);
      writeJSON(name + '.json', all);
    },
    update: (keyVal, patch) => {
      const all = readJSON(name + '.json', [], RUNTIME_DIR);
      const i = all.findIndex((d) => d[key] === keyVal);
      if (i < 0) return false;
      all[i] = { ...all[i], ...patch };
      writeJSON(name + '.json', all);
      return true;
    },
  });
}

let backend, backendName;
try {
  backend = sqliteStore();
  backendName = 'sqlite';
} catch {
  backend = jsonStore();
  backendName = 'json';
}

module.exports = {
  rooms: () => readJSON('rooms.json', []),
  site: () => readJSON('site.json', {}),
  testimonials: () => readJSON('testimonials.json', []),
  bookings: backend('bookings', 'ref'),
  subscribers: backend('subscribers', 'email'),
  messages: backend('messages', 'id'),
  backend: backendName,
};
