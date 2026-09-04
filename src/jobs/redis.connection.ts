import Redis from 'ioredis';

export function redisConnection(): Redis {
  return new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
  });
}
