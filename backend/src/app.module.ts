import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { BlocksModule } from './blocks/blocks.module';
import { MatchesModule } from './matches/matches.module';
import { AiHelperModule } from './ai-helper/ai-helper.module';
import { GatewayModule } from './gateway/gateway.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { SignalingModule } from './signaling/signaling.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    UsersModule,
    AuthModule,
    HealthModule,
    BlocksModule,
    MatchesModule,
    AiHelperModule,
    GatewayModule,
    MatchmakingModule,
    SignalingModule,
  ],
})
export class AppModule {}
