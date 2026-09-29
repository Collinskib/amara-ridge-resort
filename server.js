'use strict';
/* Local/self-hosted entrypoint. On Vercel, api/index.js is used instead. */
const { createServer } = require('./lib/app');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
createServer().listen(PORT, () => {
  console.log(`\n  Amara Ridge Resort — http://localhost:${PORT}  (store: ${store.backend})\n`);
});
