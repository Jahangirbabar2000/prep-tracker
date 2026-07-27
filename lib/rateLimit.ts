// Tiny in-memory sliding-window rate limiter. Kept as a factory with an
// injectable clock so the window logic can be unit-tested deterministically.
//
// Caveat for serverless (Vercel): state lives in one warm function instance,
// so this is a best-effort deterrent against drive-by abuse, not a hard global
// cap across many concurrent instances. For a low-traffic single-user app that's
// enough; swap in a durable store (Turso/Upstash) if you ever need hard limits.

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number; // seconds until the caller may retry (0 when ok)
}

export function createRateLimiter({
  limit,
  windowMs,
  now = () => Date.now(),
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}) {
  const hits = new Map<string, number[]>();

  return function check(key: string): RateLimitResult {
    const t = now();
    const cutoff = t - windowMs;
    const recent = (hits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (recent.length >= limit) {
      hits.set(key, recent);
      const retryAfter = Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000));
      return { ok: false, retryAfter };
    }

    recent.push(t);
    hits.set(key, recent);

    // Opportunistic cleanup so the map can't grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.every((ts) => ts <= cutoff)) hits.delete(k);
      }
    }

    return { ok: true, retryAfter: 0 };
  };
}
