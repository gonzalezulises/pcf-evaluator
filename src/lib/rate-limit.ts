// Simple in-memory rate limiter for serverless
// Note: In a multi-instance deployment, each instance has its own counter.
// For stricter enforcement, use Redis (Upstash) or similar.

const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of hits.entries()) {
    if (val.resetAt < now) hits.delete(key);
  }
}, 60_000);

export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - entry.count };
}

export function rateLimitByIp(
  request: Request,
  route: string,
  options?: { limit?: number; windowMs?: number }
): { success: boolean; remaining: number } {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return rateLimit(`${route}:${ip}`, options);
}
