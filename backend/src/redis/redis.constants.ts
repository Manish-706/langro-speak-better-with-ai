// Injection token for the ioredis client.
// Kept in a separate file to avoid circular imports between redis.module.ts and redis.service.ts.
export const REDIS_CLIENT = 'REDIS_CLIENT';
