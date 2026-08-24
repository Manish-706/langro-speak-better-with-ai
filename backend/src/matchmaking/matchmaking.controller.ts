import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(@CurrentUser() user: UserDocument) {
    return this.matchmakingService.joinQueue(user._id.toString());
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: UserDocument) {
    return this.matchmakingService.cancelQueue(user._id.toString());
  }

  @Get('status')
  getStatus(@CurrentUser() user: UserDocument) {
    return this.matchmakingService.getStatus(user._id.toString());
  }
}
