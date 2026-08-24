import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('redisUrl') as string;
        const client = new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          lazyConnect: false,
        });
        client.on('error', (err: Error) => {
          console.error('[Redis] Connection error:', err.message);
        });
        client.on('connect', () => {
          console.log('[Redis] Connected');
        });
        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
