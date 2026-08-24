import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

export const WAITING_KEY = 'matchmaking:waiting';
export const PRESENCE_PREFIX = 'user:presence:';

export type UserPresence = 'idle' | 'waiting' | 'in_call';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  // ── Matchmaking queue (sorted set) ──────────────────────────────────────────
  async addToWaiting(userId: string): Promise<void> {
    await this.client.zadd(WAITING_KEY, Date.now(), userId);
  }

  async removeFromWaiting(...userIds: string[]): Promise<void> {
    if (userIds.length > 0) {
      await this.client.zrem(WAITING_KEY, ...userIds);
    }
  }

  async isInWaiting(userId: string): Promise<boolean> {
    const score = await this.client.zscore(WAITING_KEY, userId);
    return score !== null;
  }

  async getWaitingEntries(): Promise<Array<{ userId: string; joinedAt: number }>> {
    const result = await this.client.zrange(WAITING_KEY, 0, -1, 'WITHSCORES');
    const entries: Array<{ userId: string; joinedAt: number }> = [];
    for (let i = 0; i < result.length; i += 2) {
      entries.push({ userId: result[i], joinedAt: parseFloat(result[i + 1]) });
    }
    return entries;
  }

  /**
   * Atomically removes both users from the waiting set ONLY if both are present.
   * Returns true if both were claimed, false if either was missing (already matched).
   */
  async atomicClaimPair(userAId: string, userBId: string): Promise<boolean> {
    const script = `
      local a = redis.call('zscore', KEYS[1], ARGV[1])
      local b = redis.call('zscore', KEYS[1], ARGV[2])
      if a and b then
        redis.call('zrem', KEYS[1], ARGV[1], ARGV[2])
        return 1
      end
      return 0
    `;
    const result = await this.client.eval(script, 1, WAITING_KEY, userAId, userBId);
    return result === 1;
  }

  // ── Presence ─────────────────────────────────────────────────────────────────
  async setPresence(userId: string, status: UserPresence): Promise<void> {
    const key = `${PRESENCE_PREFIX}${userId}`;
    if (status === 'idle') {
      await this.client.del(key);
    } else {
      // TTL: 2 hours as safety net — presence is actively managed
      await this.client.set(key, status, 'EX', 7200);
    }
  }

  async getPresence(userId: string): Promise<UserPresence | null> {
    const val = await this.client.get(`${PRESENCE_PREFIX}${userId}`);
    return (val as UserPresence | null) ?? null;
  }

  // ── Generic ────────────────────────────────────────────────────────────────
  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await this.client.del(...keys);
  }
}
