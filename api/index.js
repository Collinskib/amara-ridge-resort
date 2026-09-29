'use strict';
/* /api root — tiny discovery doc. */
const { handler } = require('../lib/app');

module.exports = (req, res) => {
  if (req.url === '/' || req.url === '/api') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      name: 'Amara Ridge Resort API',
      endpoints: ['/api/rooms', '/api/availability', '/api/bookings', '/api/site',
        '/api/testimonials', '/api/weather', '/api/newsletter', '/api/contact',
        '/api/payments/mpesa', '/api/admin/*'],
    }));
  }
  return handler(req, res);
};
