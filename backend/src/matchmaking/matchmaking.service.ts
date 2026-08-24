import { Injectable } from '@nestjs/common';
import { RedisService, UserPresence } from '../redis/redis.service';
import { MatchesService } from '../matches/matches.service';

export type MatchmakingStatus = 'idle' | 'waiting' | 'in_call';

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly redisService: RedisService,
    private readonly matchesService: MatchesService,
  ) {}

  async joinQueue(userId: string): Promise<{ joined: boolean }> {
    const presence = await this.redisService.getPresence(userId);

    if (presence === 'waiting') {
      // Already in queue — idempotent: just return success
      return { joined: true };
    }

    // Self-heal: end any stale active matches in MongoDB (covers crashes, tab closes,
    // socket drops where cleanup never ran) and reset Redis presence.
    await this.matchesService.endStaleMatchesForUser(userId);
    await this.redisService.setPresence(userId, 'idle');

    await this.redisService.addToWaiting(userId);
    await this.redisService.setPresence(userId, 'waiting');
    return { joined: true };
  }

  async cancelQueue(userId: string): Promise<{ cancelled: boolean }> {
    await this.redisService.removeFromWaiting(userId);
    await this.redisService.setPresence(userId, 'idle');
    return { cancelled: true };
  }

  async getStatus(userId: string): Promise<{ status: UserPresence | 'idle' }> {
    const presence = await this.redisService.getPresence(userId);
    return { status: presence ?? 'idle' };
  }
}
