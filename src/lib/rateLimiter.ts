import { getRedisClient } from './redisClient';

type Entry = { count: number; first: number };
const store = new Map<string, Entry>();

async function checkRateLimitRedis(key: string, limit = 10, windowMs = 60_000) {
  const client = await getRedisClient();
  if (!client) return null;
  const now = Math.floor(Date.now() / 1000);
  const windowSec = Math.ceil(windowMs / 1000);
  try {
    const current = await client.incr(key);
    if (current === 1) {
      await client.expire(key, windowSec);
    }
    const ttl = await client.ttl(key);
    const limited = current > limit;
    const remaining = Math.max(0, limit - current);
    const retryAfter = limited ? ttl : 0;
    return { limited, remaining, retryAfter };
  } catch (e) {
    console.warn('Redis rate-limit error, falling back to in-memory', e);
    return null;
  }
}

export async function checkRateLimit(key: string, limit = 10, windowMs = 60_000) {
  const client = await getRedisClient();
  if (client) {
    // Use Redis atomic counters
    const res = await checkRateLimitRedis(key, limit, windowMs);
    if (res) return res;
    // if Redis returns null (not ready), fall through to in-memory
  }

  // In-memory fallback (async for API consistency)
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) {
    store.set(key, { count: 1, first: now });
    return { limited: false, remaining: limit - 1, retryAfter: 0 };
  }

  if (now - entry.first > windowMs) {
    store.set(key, { count: 1, first: now });
    return { limited: false, remaining: limit - 1, retryAfter: 0 };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  store.set(key, entry);
  const limited = entry.count > limit;
  const retryAfter = limited ? Math.ceil((windowMs - (now - entry.first)) / 1000) : 0;
  return { limited, remaining, retryAfter };
}

export function getKeyFromReq(req: Request, suffix = '') {
  const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  return `${forwarded}:${suffix}`;
}
