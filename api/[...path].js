'use strict';
/*
 * Vercel serverless entrypoint — catch-all for every /api/* route.
 * req.query.path carries the path segments; req.url is reconstructed so the
 * shared handler sees the same shape it gets locally.
 */
const { handler } = require('../lib/app');

module.exports = (req, res) => {
  const segs = req.query?.path;
  if (Array.isArray(segs) && segs.length) {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = '/api/' + segs.map(encodeURIComponent).join('/') + qs;
  }
  return handler(req, res);
};
