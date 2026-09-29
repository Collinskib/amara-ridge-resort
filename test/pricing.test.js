'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.VERCEL = '1'; // isolate: mutable data goes to /tmp, never the repo

const { _internals } = require('../lib/app');
const store = require('../lib/store');
const { quote, nightlyRate, overlaps, eachNight, parseDate, isPeak } = _internals;

const room = store.rooms().find((r) => r.slug === 'deluxe-hill-view'); // rate 19500, type room
const suite = store.rooms().find((r) => r.slug === 'executive-suite');  // type suite

const d = (s) => new Date(s + 'T00:00:00Z');

test('eachNight yields one entry per night', () => {
  assert.strictEqual(eachNight(d('2027-03-10'), d('2027-03-13')).length, 3);
});

test('parseDate rejects garbage', () => {
  assert.strictEqual(parseDate('10/03/2027'), null);
  assert.strictEqual(parseDate(''), null);
  assert.ok(parseDate('2027-03-10') instanceof Date);
});

test('overlaps detects shared nights only', () => {
  assert.ok(overlaps(d('2027-03-10'), d('2027-03-14'), d('2027-03-13'), d('2027-03-20')));
  assert.ok(!overlaps(d('2027-03-10'), d('2027-03-14'), d('2027-03-14'), d('2027-03-20'))); // checkout day is free
  assert.ok(!overlaps(d('2027-03-14'), d('2027-03-20'), d('2027-03-10'), d('2027-03-14')));
});

test('weekend nights carry a 15% markup', () => {
  // 2027-03-13 is a Saturday
  const fri = nightlyRate(room, d('2027-03-12')); // Friday
  const sat = nightlyRate(room, d('2027-03-13'));
  const mon = nightlyRate(room, d('2027-03-15'));
  assert.strictEqual(sat, Math.round(room.rate * 1.15));
  assert.strictEqual(mon, room.rate);
  assert.strictEqual(fri, Math.round(room.rate * 1.15));
});

test('peak season (Dec 20 – Jan 5, Jul–Aug) adds 20%', () => {
  assert.ok(isPeak(d('2027-12-25')));
  assert.ok(isPeak(d('2027-07-15')));
  assert.ok(!isPeak(d('2027-03-10')));
  const peak = nightlyRate(room, d('2027-12-22')); // Tue, peak, not weekend
  assert.strictEqual(peak, Math.round(room.rate * 1.2));
});

test('quote computes subtotal, VAT and total correctly', () => {
  const q = quote(room, d('2027-03-09'), d('2027-03-11'), 2, 0); // Tue+Wed, off-peak
  assert.strictEqual(q.nights, 2);
  assert.strictEqual(q.subtotal, room.rate * 2);
  assert.strictEqual(q.vat, Math.round(q.subtotal * 0.16));
  assert.strictEqual(q.total, q.subtotal + q.vat);
});

test('extra guests beyond 2 add a nightly fee', () => {
  const q = quote(room, d('2027-03-09'), d('2027-03-10'), 3, 0);
  assert.strictEqual(q.breakdown[0].extraGuests, 2500);
  assert.strictEqual(q.breakdown[0].total, room.rate + 2500);
});

test('STAY3 applies to 3+ nights only', () => {
  const short = quote(room, d('2027-03-09'), d('2027-03-11'), 2, 0, 'STAY3');
  assert.ok(short.promo.error);
  const long = quote(room, d('2027-03-09'), d('2027-03-13'), 2, 0, 'STAY3');
  assert.strictEqual(long.discount, Math.round(long.subtotal * 0.12));
});

test('HONEYMOON applies to suites but not standard rooms', () => {
  const onRoom = quote(room, d('2027-03-09'), d('2027-03-11'), 2, 0, 'HONEYMOON');
  assert.ok(onRoom.promo.error);
  const onSuite = quote(suite, d('2027-03-09'), d('2027-03-11'), 2, 0, 'HONEYMOON');
  assert.strictEqual(onSuite.discount, Math.round(onSuite.subtotal * 0.15));
});

test('WEEKDAY rejects stays containing Fri/Sat nights', () => {
  const weekday = quote(room, d('2027-03-09'), d('2027-03-11'), 2, 0, 'WEEKDAY');
  assert.strictEqual(weekday.discount, Math.round(weekday.subtotal * 0.08));
  const weekend = quote(room, d('2027-03-12'), d('2027-03-14'), 2, 0, 'WEEKDAY');
  assert.ok(weekend.promo.error);
});

test('unknown promo code reports an error without discount', () => {
  const q = quote(room, d('2027-03-09'), d('2027-03-11'), 2, 0, 'NOPE123');
  assert.strictEqual(q.discount, 0);
  assert.strictEqual(q.promo.error, 'Unknown promo code');
});
