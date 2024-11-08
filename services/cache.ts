import { kv } from '@vercel/kv';

export const cache = {
  get: async (key: string) => {
    return await kv.get(key);
  },

  set: async (key: string, value: any, ttlSeconds = 86400 * 7) => {
    return await kv.set(key, value, { ex: ttlSeconds });
  },
};

// Common TTL constants
export const TTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
} as const;
