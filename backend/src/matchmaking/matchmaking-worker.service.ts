import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';
import { BlocksService } from '../blocks/blocks.service';
import { MatchesService } from '../matches/matches.service';
import { UsersService } from '../users/users.service';
import { AppGateway } from '../gateway/app.gateway';

const MATCHMAKING_TIMEOUT_MS = 30_000;

@Injectable()
export class MatchmakingWorkerService {
  private readonly logger = new Logger(MatchmakingWorkerService.name);
  private isRunning = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly blocksService: BlocksService,
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
    private readonly gateway: AppGateway,
  ) {}

  @Interval(1000)
  async runMatchingLoop(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = Date.now();
      const entries = await this.redisService.getWaitingEntries();

      if (entries.length === 0) return;

      const processed = new Set<string>();

      for (let i = 0; i < entries.length; i++) {
        const { userId, joinedAt } = entries[i];
        if (processed.has(userId)) continue;

        // ── Check expiry ─────────────────────────────────────────────────────
        if (joinedAt + MATCHMAKING_TIMEOUT_MS < now) {
          await this.redisService.removeFromWaiting(userId);
          await this.redisService.setPresence(userId, 'idle');
          this.gateway.emitToUser(userId, 'matchmaking:timeout', {
            message: 'No partner found within 30 seconds. Try again.',
          });
          processed.add(userId);
          this.logger.log(`Timeout: ${userId}`);
          continue;
        }

        // ── Search for an eligible partner ───────────────────────────────────
        for (let j = 0; j < entries.length; j++) {
          if (i === j) continue;
          const { userId: partnerId } = entries[j];
          if (processed.has(partnerId)) continue;

          const blocked = await this.blocksService.areBlocked(userId, partnerId);
          if (blocked) continue;

          // Atomically claim both from the sorted set
          const claimed = await this.redisService.atomicClaimPair(userId, partnerId);
          if (!claimed) continue;

          // Create match record
          const match = await this.matchesService.create(userId, partnerId);

          // Update presence for both
          await Promise.all([
            this.redisService.setPresence(userId, 'in_call'),
            this.redisService.setPresence(partnerId, 'in_call'),
          ]);

          // Load user names for the notification
          const [userA, userB] = await Promise.all([
            this.usersService.findById(userId),
            this.usersService.findById(partnerId),
          ]);

          // Notify both users
          this.gateway.emitToUser(userId, 'matchmaking:matched', {
            roomId: match.roomId,
            partnerId,
            partnerName: userB?.name ?? 'Partner',
          });
          this.gateway.emitToUser(partnerId, 'matchmaking:matched', {
            roomId: match.roomId,
            partnerId: userId,
            partnerName: userA?.name ?? 'Partner',
          });

          processed.add(userId);
          processed.add(partnerId);
          this.logger.log(`Matched: ${userId} ↔ ${partnerId} (room: ${match.roomId})`);
          break;
        }
      }
    } catch (err) {
      this.logger.error('Matching loop error', err);
    } finally {
      this.isRunning = false;
    }
  }
}
