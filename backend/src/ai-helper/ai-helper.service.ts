import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GeminiService } from './gemini/gemini.service';
import { AiSessionService } from './sessions/ai-session.service';
import { MatchesService } from '../matches/matches.service';

export interface ProcessTranscriptResult {
  targetUserId: string;
  suggestions: string[];
  requestId: string;
}

export interface EnableAiResult {
  success: boolean;
  isFirstForCall: boolean; // NEW: tells gateway whether to broadcast "AI active"
}

export interface DisableAiResult {
  isLastForCall: boolean; // NEW: tells gateway whether to broadcast "AI inactive"
}

@Injectable()
export class AiHelperService {
  private readonly logger = new Logger(AiHelperService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly sessionService: AiSessionService,
    private readonly matchesService: MatchesService,
  ) { }

  async enableAi(
    callId: string,
    userId: string,
    preCallEnabled: boolean,
  ): Promise<EnableAiResult> {
    this.logger.log(`[AiHelperService] enableAi: userId=${userId}, callId=${callId}, preCallEnabled=${preCallEnabled}`);

    if (!preCallEnabled) {
      return { success: false, isFirstForCall: false };
    }

    const match = await this.matchesService.findByRoomId(callId);
    if (!match || match.status !== 'active') {
      throw new BadRequestException('Call is not active');
    }

    const userAId = match.userAId.toString();
    const userBId = match.userBId.toString();
    if (userId !== userAId && userId !== userBId) {
      throw new BadRequestException('User does not belong to this call');
    }

    const partnerId = userId === userAId ? userBId : userAId;

    const existing = this.sessionService.getSession(callId, userId);

    if (existing?.state === 'disabled_permanently') {
      throw new BadRequestException('AI suggestions cannot be re-enabled during this call');
    }

    // FIX: idempotency guard — don't recreate (and wipe) an already-active session.
    if (existing?.state === 'active') {
      this.logger.warn(`[AiHelperService] enableAi called again for already-active session: user=${userId}, call=${callId}`);
      return { success: true, isFirstForCall: false };
    }

    // Check BEFORE creating this session, so we know if this is the call's first opt-in.
    const isFirstForCall = !this.sessionService.hasAnyActiveSessionForCall(callId);

    const chat = this.geminiService.createChatSession();
    this.sessionService.createSession(callId, userId, partnerId, chat);
    this.logger.log(`[AiHelperService] AI session ready for user ${userId} (partner: ${partnerId})`);

    return { success: true, isFirstForCall };
  }

  disableAi(callId: string, userId: string): DisableAiResult {
    this.logger.log(`[AiHelperService] disableAi: userId=${userId}, callId=${callId}`);
    this.sessionService.disablePermanently(callId, userId);
    const isLastForCall = !this.sessionService.hasAnyActiveSessionForCall(callId);
    return { isLastForCall };
  }

  async processTranscript(
    callId: string,
    senderUserId: string,
    speakerId: string,
    text: string,
    requestId: string,
  ): Promise<ProcessTranscriptResult | null> {
    this.logger.log(`[AiHelperService] processTranscript: callId=${callId}, sender=${senderUserId}, text="${text}"`);

    const match = await this.matchesService.findByRoomId(callId);
    if (!match) {
      return null;
    }

    const userAId = match.userAId.toString();
    const userBId = match.userBId.toString();

    // FIX: explicitly validate the sender actually belongs to this call,
    // instead of silently computing a partner from an unchecked identity.
    if (senderUserId !== userAId && senderUserId !== userBId) {
      this.logger.warn(`[AiHelperService] Rejected transcript from non-participant ${senderUserId} for call ${callId}`);
      return null;
    }

    const partnerUserId = senderUserId === userAId ? userBId : userAId;

    // ── Own context: only if the SPEAKER already has an active session. ──
    // FIX: no auto-creation. If they never opted in, this is a no-op.
    const senderSession = this.sessionService.getSession(callId, senderUserId);
    if (senderSession?.state === 'active') {
      await this.geminiService.addUserUtteranceContext(senderSession.chatSession, text);
    }

    // ── Trigger: only if the PARTNER (the listener) already has an active session. ──
    // FIX: no auto-creation here either. This is the key case that lets a
    // non-opted-in speaker's words still reach their opted-in partner's session.
    const partnerSession = this.sessionService.getSession(callId, partnerUserId);
    if (!partnerSession || partnerSession.state !== 'active') {
      return null;
    }

    const version = this.sessionService.beginGeneration(callId, partnerUserId);
    if (version === null) {
      return null; // session went inactive between the check above and now
    }

    this.logger.log(`[AiHelperService] Generating suggestions for ${partnerUserId} from: "${text}"`);
    const result = await this.geminiService.generateSuggestionsForPartnerTurn(
      partnerSession.chatSession,
      text,
    );

    this.sessionService.endGeneration(callId, partnerUserId);

    // FIX: discard this result if a newer utterance already started a fresher
    // generation while this one was in flight (rapid consecutive speech case).
    if (!this.sessionService.isGenerationStillCurrent(callId, partnerUserId, version)) {
      this.logger.log(`[AiHelperService] Discarding stale suggestion for ${partnerUserId} (superseded by newer turn)`);
      return null;
    }

    if (result.suggestions && result.suggestions.length > 0) {
      return {
        targetUserId: partnerUserId,
        suggestions: result.suggestions,
        requestId,
      };
    }

    return null;
  }

  cleanupCall(callId: string): void {
    this.logger.log(`[AiHelperService] cleanupCall: ${callId}`);
    this.sessionService.destroyAllForCall(callId);
  }
}