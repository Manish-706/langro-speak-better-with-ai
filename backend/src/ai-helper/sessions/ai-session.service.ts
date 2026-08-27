import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AiSession, AiState } from './ai-session.types';

/** Sessions older than this with no active state are evicted by the TTL sweep. */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
/** How often the TTL sweep runs. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class AiSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(AiSessionService.name);
  private readonly sessions = new Map<string, AiSession>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  private getKey(callId: string, userId: string): string {
    return `${callId}:${userId}`;
  }

  constructor() {
    // Fix #10: periodically evict sessions that were never cleaned up due to
    // abnormal terminations (browser crash, server restart mid-call, etc.).
    this.cleanupInterval = setInterval(() => this.evictStaleSessions(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  private evictStaleSessions(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.logger.warn(`TTL sweep evicted ${evicted} stale AI session(s)`);
    }
  }

  createSession(
    callId: string,
    userId: string,
    partnerId: string,
    chatSession: any,
  ): AiSession {
    const key = this.getKey(callId, userId);
    const session: AiSession = {
      callId,
      userId,
      partnerId,
      chatSession,
      state: 'active',
      generationInFlight: false,
      generationVersion: 0, // NEW: bumped on every new generation request
      createdAt: Date.now(),
    };
    this.sessions.set(key, session);
    this.logger.log(`Created AI session for user ${userId} in call ${callId}`);
    return session;
  }

  getSession(callId: string, userId: string): AiSession | undefined {
    return this.sessions.get(this.getKey(callId, userId));
  }

  // NEW: does ANY participant in this call currently have an active session?
  // Used to decide whether to tell both browsers "AI is active, start local STT."
  hasAnyActiveSessionForCall(callId: string): boolean {
    for (const session of this.sessions.values()) {
      if (session.callId === callId && session.state === 'active') {
        return true;
      }
    }
    return false;
  }

  // NEW: bump the version and return it, so the caller can detect staleness
  // after an async Gemini call resolves.
  beginGeneration(callId: string, userId: string): number | null {
    const session = this.getSession(callId, userId);
    if (!session || session.state !== 'active') return null;
    session.generationInFlight = true;
    session.generationVersion = (session.generationVersion ?? 0) + 1;
    return session.generationVersion;
  }

  // NEW: caller passes back the version it started with; returns true only
  // if no newer generation has started since (i.e. this result is still fresh).
  isGenerationStillCurrent(callId: string, userId: string, version: number): boolean {
    const session = this.getSession(callId, userId);
    return !!session && session.generationVersion === version;
  }

  endGeneration(callId: string, userId: string): void {
    const session = this.getSession(callId, userId);
    if (session) session.generationInFlight = false;
  }

  disablePermanently(callId: string, userId: string): void {
    const session = this.getSession(callId, userId);
    if (session) {
      session.state = 'disabled_permanently';
      session.chatSession = null;
      session.generationInFlight = false;
      this.logger.log(`Permanently disabled AI for user ${userId} in call ${callId}`);
    }
  }

  destroySession(callId: string, userId: string): void {
    const key = this.getKey(callId, userId);
    this.sessions.delete(key);
    this.logger.log(`Destroyed AI session for user ${userId} in call ${callId}`);
  }

  destroyAllForCall(callId: string): void {
    for (const [key, session] of this.sessions.entries()) {
      if (session.callId === callId) {
        this.sessions.delete(key);
      }
    }
    this.logger.log(`Destroyed all AI sessions for call ${callId}`);
  }
}