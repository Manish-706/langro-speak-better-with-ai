import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';
import { DeepgramService } from './deepgram/deepgram.service';
import { MatchesService } from '../matches/matches.service';
import { DeepgramTokenDto } from './deepgram/deepgram.types';

@Controller('ai-helper')
@UseGuards(JwtAuthGuard)
export class AiHelperController {
  constructor(
    private readonly deepgramService: DeepgramService,
    private readonly matchesService: MatchesService,
  ) {}

  @Get('deepgram-token')
  async getDeepgramToken(
    @CurrentUser() user: UserDocument,
    @Query('callId') callId: string,
  ): Promise<DeepgramTokenDto> {
    if (!callId) {
      throw new BadRequestException('callId is required');
    }

    const match = await this.matchesService.findByRoomId(callId);
    if (!match || match.status !== 'active') {
      throw new BadRequestException('Call is not active');
    }

    const userId = user._id.toString();
    const userAId = match.userAId.toString();
    const userBId = match.userBId.toString();
    if (userId !== userAId && userId !== userBId) {
      throw new BadRequestException('User does not belong to this call');
    }

    return this.deepgramService.createTemporaryToken();
  }
}
