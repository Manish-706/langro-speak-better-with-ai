import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { MatchesService } from '../matches/matches.service';
import { AiHelperService } from '../ai-helper/ai-helper.service';

export interface AuthSocket extends Socket {
  data: {
    userId: string;
    userName: string;
  };
}

interface TranscriptDto {
  callId: string;
  speakerId: string;
  text: string;
  isFinal: boolean;
  sequence: number;
  timestamp: number;
  requestId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  // userId → Set of socketIds (multiple tabs/connections)
  private readonly userSockets = new Map<string, Set<string>>();
  // socketId → userId (reverse lookup)
  private readonly socketUsers = new Map<string, string>();
  // socketId → roomId (for connected call participants)
  private readonly socketRooms = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly matchesService: MatchesService,
    private readonly aiHelperService: AiHelperService,
  ) { }

  async handleConnection(socket: AuthSocket): Promise<void> {
    try {
      const token = this.extractToken(socket);
      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; email: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        socket.disconnect();
        return;
      }

      socket.data.userId = user._id.toString();
      socket.data.userName = user.name;

      this.addSocket(socket.data.userId, socket.id);
      this.logger.log(`Socket connected: ${socket.id} (user: ${user.name})`);
    } catch {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: AuthSocket): Promise<void> {
    const userId = socket.data?.userId;
    if (!userId) return;

    this.logger.log(`Socket disconnected: ${socket.id} (user: ${userId})`);

    // Clean up matchmaking queue if user was waiting
    const wasWaiting = await this.redisService.isInWaiting(userId);
    if (wasWaiting) {
      await this.redisService.removeFromWaiting(userId);
      await this.redisService.setPresence(userId, 'idle');
    }

    // Notify call partner and cleanup presence for both participants
    const roomId = this.socketRooms.get(socket.id);
    if (roomId) {
      socket.to(roomId).emit('call:partner-disconnected', { reason: 'socket_disconnected' });
      const match = await this.matchesService.findByRoomId(roomId);
      if (match) {
        const userAId = match.userAId.toString();
        const userBId = match.userBId.toString();
        await Promise.all([
          this.redisService.setPresence(userAId, 'idle'),
          this.redisService.setPresence(userBId, 'idle'),
        ]);
      } else {
        await this.redisService.setPresence(userId, 'idle');
      }
      await this.matchesService.endMatch(roomId);
      this.aiHelperService.cleanupCall(roomId);
      this.socketRooms.delete(socket.id);
    }

    this.removeSocket(userId, socket.id);
  }

  // ── Matchmaking events ────────────────────────────────────────────────────
  @SubscribeMessage('matchmaking:cancel')
  async handleCancel(@ConnectedSocket() socket: AuthSocket): Promise<void> {
    const userId = socket.data?.userId;
    if (!userId) return;
    await this.redisService.removeFromWaiting(userId);
    await this.redisService.setPresence(userId, 'idle');
    socket.emit('matchmaking:cancelled', { reason: 'user_cancelled' });
  }

  // ── WebRTC signaling events ───────────────────────────────────────────────
  @SubscribeMessage('call:ready')
  async handleCallReady(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    const userId = socket.data?.userId;
    if (!userId || !roomId) return;

    const match = await this.matchesService.findByRoomId(roomId);
    if (!match || match.status !== 'active') {
      socket.emit('call:error', { message: 'Room not found or already ended' });
      return;
    }

    // Verify user belongs to this match
    const userAId = match.userAId.toString();
    const userBId = match.userBId.toString();
    if (userId !== userAId && userId !== userBId) {
      socket.emit('call:error', { message: 'Not authorized for this room' });
      return;
    }

    socket.join(roomId);
    this.socketRooms.set(socket.id, roomId);

    // When both peers are in the room, tell them who initiates the offer
    const socketsInRoom = await this.server.in(roomId).fetchSockets();
    if (socketsInRoom.length >= 2) {
      socketsInRoom.forEach((s) => {
        const sUserId = (s.data as { userId: string }).userId;
        s.emit('call:start', {
          shouldOffer: sUserId === userAId,
          roomId,
        });
      });
    }
  }

  @SubscribeMessage('webrtc:offer')
  handleOffer(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { roomId: string; offer: RTCSessionDescriptionInit },
  ): void {
    socket.to(data.roomId).emit('webrtc:offer', { offer: data.offer });
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { roomId: string; answer: RTCSessionDescriptionInit },
  ): void {
    socket.to(data.roomId).emit('webrtc:answer', { answer: data.answer });
  }

  @SubscribeMessage('webrtc:ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { roomId: string; candidate: RTCIceCandidateInit },
  ): void {
    socket.to(data.roomId).emit('webrtc:ice-candidate', { candidate: data.candidate });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const { roomId } = data;
    const userId = socket.data?.userId;
    if (!userId || !roomId) return;

    socket.to(roomId).emit('call:partner-ended', {});
    socket.leave(roomId);
    this.socketRooms.delete(socket.id);

    // Reset presence for both users associated with this match
    const match = await this.matchesService.findByRoomId(roomId);
    if (match) {
      const userAId = match.userAId.toString();
      const userBId = match.userBId.toString();
      await Promise.all([
        this.redisService.setPresence(userAId, 'idle'),
        this.redisService.setPresence(userBId, 'idle'),
      ]);
    } else {
      await this.redisService.setPresence(userId, 'idle');
    }

    await this.matchesService.endMatch(roomId);
    this.aiHelperService.cleanupCall(roomId);
  }

  // ── AI Helper Events ───────────────────────────────────────────────────────
  @SubscribeMessage('ai:enable')
  async handleAiEnable(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { callId: string; preCallEnabled: boolean },
  ): Promise<void> {
    const userId = socket.data?.userId;
    if (!userId || !data?.callId) return;

    try {
      const result = await this.aiHelperService.enableAi(data.callId, userId, data.preCallEnabled);
      if (result.success) {
        socket.emit('ai:enabled', { callId: data.callId });
        this.logger.log(`AI Helper enabled for user ${userId} in call ${data.callId}`);

        // NEW: tell BOTH participants that AI is active for this call, so the
        // non-opted-in partner's browser also starts running local STT.
        if (result.isFirstForCall) {
          this.server.to(data.callId).emit('ai:helper-active-for-call', { callId: data.callId });
          this.logger.log(`Broadcast ai:helper-active-for-call for room ${data.callId}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enable AI helper';
      socket.emit('ai:error', { message: msg });
    }
  }

  @SubscribeMessage('ai:disable')
  handleAiDisable(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { callId: string },
  ): void {
    const userId = socket.data?.userId;
    if (!userId || !data?.callId) return;

    const result = this.aiHelperService.disableAi(data.callId, userId);
    socket.emit('ai:disabled', { callId: data.callId });
    this.logger.log(`AI Helper disabled for user ${userId} in call ${data.callId}`);

    // NEW: if nobody in the call has AI on anymore, tell both browsers to stop.
    if (result.isLastForCall) {
      this.server.to(data.callId).emit('ai:helper-inactive-for-call', { callId: data.callId });
      this.logger.log(`Broadcast ai:helper-inactive-for-call for room ${data.callId}`);
    }
  }

  @SubscribeMessage('ai:transcript')
  async handleTranscript(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: TranscriptDto,
  ): Promise<void> {
    const userId = socket.data?.userId;
    if (!userId || !data?.callId || !data?.text?.trim()) return;

    const requestId = data.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      this.logger.log(`[AppGateway] Received transcript from user ${userId} (speaker: ${data.speakerId}): "${data.text}"`);
      const result = await this.aiHelperService.processTranscript(
        data.callId,
        userId,
        data.speakerId,
        data.text,
        requestId,
      );

      if (result && result.suggestions.length > 0) {
        this.logger.log(`[AppGateway] Dispatching ${result.suggestions.length} suggestions to target user ${result.targetUserId}`);
        this.emitToUser(result.targetUserId, 'ai:suggestions', {
          requestId: result.requestId,
          suggestions: result.suggestions,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing transcript';
      this.logger.warn(`Transcript error for user ${userId}: ${msg}`);
    }
  }

  // ── Public helper to emit to user ─────────────────────────────────────────
  emitToUser(userId: string, event: string, data: unknown): void {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    } else {
      this.logger.warn(`Cannot emit ${event} to user ${userId}: socket not found`);
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────
  private extractToken(socket: Socket): string | null {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private addSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.socketUsers.set(socketId, userId);
  }

  private removeSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) this.userSockets.delete(userId);
    }
    this.socketUsers.delete(socketId);
  }
}
