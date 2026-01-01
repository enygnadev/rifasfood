import Redis from 'ioredis';

let client: Redis | null = null;

export async function getRedisClient() {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 500, enableOfflineQueue: false });
  client.on('error', (e) => console.warn('Redis error', e));
  try {
    await client.connect();
    return client;
  } catch (e) {
    console.warn('Redis connect failed', e);
    try { client.disconnect(); } catch (err) { /* ignore */ }
    client = null;
    return null;
  }
}
