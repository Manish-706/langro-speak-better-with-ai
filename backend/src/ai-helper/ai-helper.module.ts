import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini/gemini.service';
import { AiSessionService } from './sessions/ai-session.service';
import { AiHelperService } from './ai-helper.service';
import { AiHelperController } from './ai-helper.controller';
import { DeepgramService } from './deepgram/deepgram.service';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [ConfigModule, MatchesModule],
  controllers: [AiHelperController],
  providers: [GeminiService, AiSessionService, AiHelperService, DeepgramService],
  exports: [AiHelperService, GeminiService],
})
export class AiHelperModule {}

