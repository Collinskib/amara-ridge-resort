'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  const tmp = path.join(DATA_DIR, file + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, path.join(DATA_DIR, file));
}

module.exports = {
  rooms: () => readJSON('rooms.json', []),
  site: () => readJSON('site.json', {}),
  testimonials: () => readJSON('testimonials.json', []),
  bookings: () => readJSON('bookings.json', []),
  saveBookings: (b) => writeJSON('bookings.json', b),
  subscribers: () => readJSON('subscribers.json', []),
  saveSubscribers: (s) => writeJSON('subscribers.json', s),
  messages: () => readJSON('messages.json', []),
  saveMessages: (m) => writeJSON('messages.json', m),
};
