import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { RedisService } from '../redis/redis.service';
import { MatchesService } from '../matches/matches.service';

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let redisService: jest.Mocked<RedisService>;
  let matchesService: jest.Mocked<MatchesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        {
          provide: RedisService,
          useValue: {
            getPresence: jest.fn(),
            setPresence: jest.fn(),
            addToWaiting: jest.fn(),
            removeFromWaiting: jest.fn(),
            isInWaiting: jest.fn(),
          },
        },
        {
          provide: MatchesService,
          useValue: {
            hasActiveMatch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
    redisService = module.get(RedisService);
    matchesService = module.get(MatchesService);
  });

  describe('joinQueue', () => {
    it('should join the queue successfully when user is idle', async () => {
      redisService.getPresence.mockResolvedValue(null);
      matchesService.hasActiveMatch.mockResolvedValue(false);
      redisService.addToWaiting.mockResolvedValue();
      redisService.setPresence.mockResolvedValue();

      const result = await service.joinQueue('user-1');
      expect(result.joined).toBe(true);
      expect(redisService.addToWaiting).toHaveBeenCalledWith('user-1');
    });

    it('should throw ConflictException when user is already waiting', async () => {
      redisService.getPresence.mockResolvedValue('waiting');

      await expect(service.joinQueue('user-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when user is in a call', async () => {
      redisService.getPresence.mockResolvedValue('in_call');

      await expect(service.joinQueue('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelQueue', () => {
    it('should cancel matchmaking and reset presence', async () => {
      redisService.removeFromWaiting.mockResolvedValue();
      redisService.setPresence.mockResolvedValue();

      const result = await service.cancelQueue('user-1');
      expect(result.cancelled).toBe(true);
      expect(redisService.setPresence).toHaveBeenCalledWith('user-1', 'idle');
    });
  });

  describe('getStatus', () => {
    it('should return idle when no presence set', async () => {
      redisService.getPresence.mockResolvedValue(null);
      const result = await service.getStatus('user-1');
      expect(result.status).toBe('idle');
    });

    it('should return waiting when user is in queue', async () => {
      redisService.getPresence.mockResolvedValue('waiting');
      const result = await service.getStatus('user-1');
      expect(result.status).toBe('waiting');
    });
  });
});
