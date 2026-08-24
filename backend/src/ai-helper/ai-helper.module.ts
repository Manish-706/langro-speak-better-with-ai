import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini/gemini.service';
import { AiSessionService } from './sessions/ai-session.service';
import { AiHelperService } from './ai-helper.service';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [ConfigModule, MatchesModule],
  providers: [GeminiService, AiSessionService, AiHelperService],
  exports: [AiHelperService, GeminiService],
})
export class AiHelperModule {}
