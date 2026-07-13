// Per-account login lockout — separate from the IP-based rate limiter in
// routes/auth.js. This protects one specific account against repeated wrong
// username/email-or-password guesses even if they come from many different
// IPs; the rate limiter protects against one IP hammering many accounts.
// In-memory is fine here: a restart just clears lockouts, which is an
// acceptable tradeoff for a small school deployment.

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 10 * 60 * 1000;

const attempts = new Map(); // normalized identifier -> { count, lockedUntil }

function getStatus(key) {
  const entry = attempts.get(key);
  if (!entry) return { locked: false };
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    attempts.delete(key);
    return { locked: false };
  }
  if (entry.lockedUntil) {
    return { locked: true, retryAfterMs: entry.lockedUntil - Date.now() };
  }
  return { locked: false };
}

function recordFailure(key) {
  const entry = attempts.get(key) || { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCKOUT_MS;
  attempts.set(key, entry);
  return entry;
}

function recordSuccess(key) {
  attempts.delete(key);
}

// Periodic sweep so the map doesn't grow unbounded with stale entries.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.lockedUntil && now >= entry.lockedUntil) attempts.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = { getStatus, recordFailure, recordSuccess, MAX_ATTEMPTS, LOCKOUT_MS };
