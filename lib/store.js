'use strict';
/*
 * Storage layer.
 * - Catalogue (rooms, site content, testimonials): loaded via require() so the
 *   files are traced into the serverless bundle on Vercel — no fs, no includeFiles.
 * - Mutable collections (bookings, subscribers, messages): SQLite via node:sqlite
 *   when available, otherwise JSON files. On Vercel the bundled FS is read-only,
 *   so mutable data lives under /tmp (ephemeral — fine for a demo deploy).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const ON_VERCEL = !!process.env.VERCEL;

/* Bundled seed data — require() guarantees these ship inside the function bundle */
const SEED = {
  rooms: require('../data/rooms.json'),
  site: require('../data/site.json'),
  testimonials: require('../data/testimonials.json'),
  bookings: require('../data/bookings.json'),
  subscribers: require('../data/subscribers.json'),
  messages: require('../data/messages.json'),
};

const DATA_DIR = path.join(__dirname, '..', 'data');       // read-write locally
const RUNTIME_DIR = ON_VERCEL ? path.join(os.tmpdir(), 'amara-data') : DATA_DIR;

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(RUNTIME_DIR, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  const tmp = path.join(RUNTIME_DIR, file + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, path.join(RUNTIME_DIR, file));
}

/* ---------- SQLite backend (preferred) ---------- */

function sqliteStore() {
  const { DatabaseSync } = require('node:sqlite'); // throws if unavailable
  const dbFile = ON_VERCEL ? path.join(os.tmpdir(), 'amara.db') : path.join(DATA_DIR, 'app.db');
  const db = new DatabaseSync(dbFile);
  db.exec(`CREATE TABLE IF NOT EXISTS docs (
    collection TEXT NOT NULL,
    doc TEXT NOT NULL
  )`);

  const seedIfEmpty = (name) => {
    const n = db.prepare('SELECT COUNT(*) c FROM docs WHERE collection=?').get(name).c;
    if (n === 0) {
      const ins = db.prepare('INSERT INTO docs (collection, doc) VALUES (?, ?)');
      for (const d of SEED[name]) ins.run(name, JSON.stringify(d));
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
  const seeded = new Set();
  const ensureSeeded = (name) => {
    const file = path.join(RUNTIME_DIR, name + '.json');
    if (!seeded.has(name) && !fs.existsSync(file)) {
      writeJSON(name + '.json', SEED[name]);
    }
    seeded.add(name);
  };
  return (name, key) => ({
    all: () => { ensureSeeded(name); return readJSON(name + '.json', []); },
    insert: (doc) => {
      ensureSeeded(name);
      const all = readJSON(name + '.json', []);
      all.push(doc);
      writeJSON(name + '.json', all);
    },
    update: (keyVal, patch) => {
      ensureSeeded(name);
      const all = readJSON(name + '.json', []);
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
  rooms: () => SEED.rooms,
  site: () => SEED.site,
  testimonials: () => SEED.testimonials,
  bookings: backend('bookings', 'ref'),
  subscribers: backend('subscribers', 'email'),
  messages: backend('messages', 'id'),
  backend: backendName,
};
