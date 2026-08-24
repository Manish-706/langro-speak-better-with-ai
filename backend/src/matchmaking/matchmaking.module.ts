import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingWorkerService } from './matchmaking-worker.service';
import { GatewayModule } from '../gateway/gateway.module';
import { BlocksModule } from '../blocks/blocks.module';
import { MatchesModule } from '../matches/matches.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ScheduleModule,
    GatewayModule,
    BlocksModule,
    MatchesModule,
    UsersModule,
  ],
  controllers: [MatchmakingController],
  providers: [MatchmakingService, MatchmakingWorkerService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
