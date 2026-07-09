// Simple in-memory rate limiter. Protects your API budget from abuse and
// runaway loops without needing an external store. Limits are per-IP.

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_PER_WINDOW = 15; // messages per IP per minute
const MAX_PER_DAY = 300; // messages per IP per day

const minuteBuckets = new Map(); // ip -> { count, resetAt }
const dayBuckets = new Map(); // ip -> { count, resetAt }

function hit(map, ip, windowMs, max) {
  const now = Date.now();
  let b = map.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    map.set(ip, b);
  }
  b.count++;
  return b.count <= max;
}

// Periodically clear old buckets so memory doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of minuteBuckets) if (now > b.resetAt) minuteBuckets.delete(ip);
  for (const [ip, b] of dayBuckets) if (now > b.resetAt) dayBuckets.delete(ip);
}, 5 * 60 * 1000).unref();

export function rateLimit(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const okMinute = hit(minuteBuckets, ip, WINDOW_MS, MAX_PER_WINDOW);
  const okDay = hit(dayBuckets, ip, 24 * 60 * 60 * 1000, MAX_PER_DAY);

  if (!okMinute) {
    return res.status(429).json({
      error: "Too many messages. Please wait a moment and try again.",
    });
  }
  if (!okDay) {
    return res.status(429).json({
      error:
        "You've reached today's message limit. Please contact support directly if you still need help.",
    });
  }
  next();
}
