// Retries a function with exponential backoff. Makes the bot resilient to
// transient API errors (rate limits, brief network blips) instead of failing
// the customer's message on the first hiccup.

export async function withRetry(fn, { retries = 3, baseMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Don't retry client errors (bad request, auth) — only transient ones.
      const status = err?.status || err?.statusCode;
      const retryable =
        status === 429 || status === 500 || status === 502 || status === 503 || status === 529 || status === undefined;
      if (!retryable || attempt === retries) break;
      const delay = baseMs * Math.pow(2, attempt) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
