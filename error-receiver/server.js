const express = require('express');
const app = express();

const cors = require('cors');

// Browser error reports are a handful of short strings. 32 KiB per request
// is far above anything the app sends and caps what a rogue client can push.
const BODY_LIMIT = '32kb';

// Free-form report fields are bounded too, so one poisoned report cannot
// bloat the logs.
const MAX_FIELD_CHARS = 8 * 1024;
const MAX_FIELDS = 20;
const MAX_KEY_CHARS = 64;

// Fixed-window rate limit per client address. The app reports real crashes
// a handful of times per session at most; anything past the ceiling is
// refused so the endpoint cannot be flooded. Addresses are only as good as
// the proxy chain, so trusting X-Forwarded-For is opt-in via TRUST_PROXY
// (an express `trust proxy` value, e.g. "1" behind one ingress) — by
// default the socket address is used, which a client cannot spoof.
const RATE_LIMIT = Number.parseInt(process.env.RATE_LIMIT || '60', 10);
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map();

function countHit(address) {
  const now = Date.now();
  const entry = hits.get(address);
  if (!entry || now >= entry.resetAt) {
    // Opportunistically drop expired entries so the map cannot grow without
    // bound under rotating addresses.
    if (hits.size > 1024) {
      for (const [key, value] of hits) {
        if (now >= value.resetAt) hits.delete(key);
      }
    }
    hits.set(address, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

// Comma-separated browser origins allowed to POST reports (e.g.
// "https://cards.example.org"). Unset keeps the long-standing allow-any
// origin behavior so existing deployments keep working; set it in
// production to pin the endpoint to the app's own origin.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

app.use(express.json({ limit: BODY_LIMIT }));
app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : {}));

/** Keep only the report's scalar fields, bounded; nested or oversized
 *  values are stringified and cut rather than logged verbatim. */
function sanitizeReport(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const report = {};
  for (const [key, value] of Object.entries(body).slice(0, MAX_FIELDS)) {
    if (key.length > MAX_KEY_CHARS) continue;
    if (typeof value === 'string') {
      report[key] = value.length > MAX_FIELD_CHARS
        ? `${value.slice(0, MAX_FIELD_CHARS)}…[truncated]`
        : value;
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      report[key] = value;
    } else {
      report[key] = JSON.stringify(value)?.slice(0, MAX_FIELD_CHARS);
    }
  }
  return report;
}

app.post('/report', (req, res) => {
  if (!countHit(req.ip)) {
    res.status(429).send('Too many error reports');
    return;
  }
  const report = sanitizeReport(req.body);
  if (report === null) {
    res.status(400).send('Error report must be a JSON object');
    return;
  }
  console.log('Received error report:', JSON.stringify(report, null, 2));
  res.status(200).send('Error report received');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Error receiver server listening on port ${PORT}`);
  });
}