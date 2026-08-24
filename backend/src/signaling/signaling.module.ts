import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';

/**
 * SignalingModule — Phase 2.
 * WebRTC signaling events (offer, answer, ICE candidates) are handled directly
 * in AppGateway (GatewayModule). This module serves as the extension point
 * for Phase 3+ signaling features (e.g., call recording, transcription triggers).
 */
@Module({
  imports: [GatewayModule],
})
export class SignalingModule {}
