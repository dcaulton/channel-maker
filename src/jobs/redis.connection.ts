import type { ConnectionOptions } from 'bullmq';

// Options, not a live client. BullMQ creates the connections and can close
// them. A client we construct here is ours to quit, and Jest will wait on it.
// Use BullMQ's options type: ioredis RedisOptions has no `url` field.
export function redisConnection(): ConnectionOptions {
  return {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    maxRetriesPerRequest: null,
    // Jest sets this. Give up instead of retrying a container we just stopped.
    ...(process.env.JEST_WORKER_ID ? { retryStrategy: () => null } : {}),
  };
}
