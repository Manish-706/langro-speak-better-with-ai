import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppGateway } from './app.gateway';
import { UsersModule } from '../users/users.module';
import { MatchesModule } from '../matches/matches.module';
import { AiHelperModule } from '../ai-helper/ai-helper.module';

@Module({
  imports: [
    UsersModule,
    MatchesModule,
    AiHelperModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('jwt.secret'),
        signOptions: { expiresIn: cs.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}
