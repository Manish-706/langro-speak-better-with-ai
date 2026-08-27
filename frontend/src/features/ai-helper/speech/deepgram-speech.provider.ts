// src/features/ai-helper/speech/deepgram-speech.provider.ts
import { SpeechProvider, SpeechResult, SpeechError, SpeechRecognitionOptions } from './speechProvider.interface';
import type { DeepgramStreamingResult } from './deepgram.types';
import { fetchDeepgramToken } from '@/lib/api/deepgram.api';

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_SIZE = 512; // 32ms frames @ 16kHz

export class DeepgramSpeechProvider implements SpeechProvider {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private currentStream: MediaStream | null = null;

  private shouldRestart = false;
  private isStarting = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private restartAttempts = 0;
  private readonly MAX_RESTART_ATTEMPTS = 5;

  private resultCallback: ((result: SpeechResult) => void) | null = null;
  private errorCallback: ((error: SpeechError) => void) | null = null;
  private endCallback: (() => void) | null = null;

  private callId: string | null = null;

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'WebSocket' in window &&
      ('AudioContext' in window || 'webkitAudioContext' in window) &&
      'AudioWorkletNode' in window
    );
  }

  private clearKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private buildDeepgramUrl(): string {
    const params = new URLSearchParams({
      model: 'nova-3',
      language: 'en-US',
      smart_format: 'true',
      punctuate: 'true',
      endpointing: '300',
      utterance_end_ms: '1000',
      interim_results: 'true',
      encoding: 'linear16',
      sample_rate: String(TARGET_SAMPLE_RATE),
      channels: '1',
    });
    return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  }

  private handleMessage(data: DeepgramStreamingResult) {
    if (data.type === 'UtteranceEnd') {
      console.log('[DeepgramSTT] 🔚 UtteranceEnd received from Deepgram VAD');
      return;
    }

    if (data.type === 'Metadata') return;

    const alt = data.channel?.alternatives?.[0];
    if (!alt) return;

    const text = (alt.transcript || '').trim();
    const isFinal = Boolean(data.is_final);
    const confidence = alt.confidence ?? 1;

    if (!text) return;

    if (isFinal) {
      console.log(`[DeepgramSTT] 🎯 Finalized Sentence (${Math.round(confidence * 100)}% conf): "${text}"`);
      this.resultCallback?.({ transcript: text, isFinal: true, confidence });
    } else {
      console.log(`[DeepgramSTT] ⏳ Interim: "${text}"`);
      this.resultCallback?.({ transcript: text, isFinal: false, confidence });
    }
  }

  private async setupAudioWorklet(): Promise<void> {
    if (!this.currentStream) return;

    // Clean up previous context if exists
    await this.teardownAudioNodes();

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx({ latencyHint: 'interactive' });
    this.audioContext = audioCtx;

    // Load static processor from public/audio-processor.js
    await audioCtx.audioWorklet.addModule('/audio-processor.js');

    const source = audioCtx.createMediaStreamSource(this.currentStream);
    this.sourceNode = source;

    const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor', {
      processorOptions: {
        targetSampleRate: TARGET_SAMPLE_RATE,
        chunkSize: CHUNK_SIZE,
      },
    });
    this.workletNode = workletNode;

    // Stream raw 16kHz PCM ArrayBuffers straight to WebSocket
    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (event.data && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(event.data);
      }
    };

    source.connect(workletNode);

    // Dummy gain to prevent browser garbage-collecting the worklet rendering node
    const dummyGain = audioCtx.createGain();
    dummyGain.gain.value = 0;
    workletNode.connect(dummyGain);
    dummyGain.connect(audioCtx.destination);

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    console.log('[DeepgramSTT] 🎙️ AudioWorklet (16kHz PCM) active and streaming to Deepgram');
  }

  private async teardownAudioNodes(): Promise<void> {
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ isPaused: true });
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  private async connect(): Promise<void> {
    if (!this.callId || !this.currentStream) {
      console.warn('[DeepgramSTT] Cannot connect: missing callId or active audio stream', {
        callId: this.callId,
        hasStream: !!this.currentStream,
      });
      return;
    }

    this.isStarting = true;
    console.log(`[DeepgramSTT] 🔑 Fetching temporary token for callId: ${this.callId}...`);

    let accessToken: string;
    try {
      const { token } = await fetchDeepgramToken(this.callId);
      accessToken = token;
      console.log('[DeepgramSTT] ✅ Token fetched successfully');
    } catch (err) {
      this.isStarting = false;
      console.error('[DeepgramSTT] ❌ Token fetch failed:', err);
      this.errorCallback?.({ error: 'token_fetch_failed', message: 'Could not get Deepgram token' });
      if (this.shouldRestart) this.scheduleRestart();
      return;
    }

    if (!this.shouldRestart) {
      console.log('[DeepgramSTT] Connection aborted because shouldRestart is false');
      this.isStarting = false;
      return;
    }

    const wsUrl = this.buildDeepgramUrl();
    console.log('[DeepgramSTT] 🌐 Opening WebSocket connection to Deepgram (Raw Linear16 PCM)...');
    const ws = new WebSocket(wsUrl, ['token', accessToken]);
    ws.binaryType = 'arraybuffer';

    ws.onopen = async () => {
      console.log('[DeepgramSTT] ✅ WebSocket connected! Initializing AudioWorklet...');
      this.isStarting = false;
      this.restartAttempts = 0;

      // 5-second KeepAlive heartbeat so Deepgram does not timeout during silence
      this.clearKeepAlive();
      this.keepAliveTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'KeepAlive' }));
          } catch {}
        }
      }, 5000);

      try {
        await this.setupAudioWorklet();
      } catch (audioErr) {
        console.error('[DeepgramSTT] ❌ AudioWorklet initialization failed:', audioErr);
        this.errorCallback?.({
          error: 'audioworklet_error',
          message: 'Failed to initialize raw PCM AudioWorklet',
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as DeepgramStreamingResult;
        this.handleMessage(parsed);
      } catch (err) {
        console.warn('[DeepgramSTT] Failed to parse message JSON:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('[DeepgramSTT] ❌ WebSocket error event:', event);
      this.errorCallback?.({ error: 'websocket_error', message: 'Deepgram connection error' });
    };

    ws.onclose = async (event) => {
      console.log(`[DeepgramSTT] ⏹️ WebSocket closed (code: ${event.code}, reason: "${event.reason || 'none'}")`);
      this.clearKeepAlive();
      await this.teardownAudioNodes();
      this.endCallback?.();

      if (this.shouldRestart) {
        this.scheduleRestart();
      }
    };

    this.ws = ws;
  }

  private scheduleRestart() {
    this.restartAttempts++;
    if (this.restartAttempts > this.MAX_RESTART_ATTEMPTS) {
      console.error(`[DeepgramSTT] ❌ Max retry attempts (${this.MAX_RESTART_ATTEMPTS}) exceeded. Giving up.`);
      this.errorCallback?.({
        error: 'max_retries_exceeded',
        message: 'Deepgram connection failed repeatedly — giving up.',
      });
      this.shouldRestart = false;
      return;
    }

    if (this.restartTimer) clearTimeout(this.restartTimer);
    const delay = Math.min(500 * 2 ** (this.restartAttempts - 1), 8000);
    console.log(`[DeepgramSTT] 🔄 Scheduling reconnect attempt #${this.restartAttempts}/${this.MAX_RESTART_ATTEMPTS} in ${delay}ms...`);
    this.restartTimer = setTimeout(() => {
      if (this.shouldRestart) this.connect();
    }, delay);
  }

  start(
    audioSource?: MediaStreamTrack | MediaStream | null,
    options?: SpeechRecognitionOptions & { callId?: string },
  ): void {
    if (!this.isSupported()) {
      console.warn('[DeepgramSTT] Speech recognition / AudioWorklet not supported in this browser');
      return;
    }

    if (!audioSource) {
      console.warn('[DeepgramSTT] start() called without an audio source');
      return;
    }

    if (audioSource instanceof MediaStream) {
      this.currentStream = audioSource;
    } else if (audioSource instanceof MediaStreamTrack) {
      this.currentStream = new MediaStream([audioSource]);
    }

    this.callId = options?.callId ?? this.callId;
    console.log('[DeepgramSTT] ▶️ start() called with callId:', this.callId);

    this.shouldRestart = true;
    this.restartAttempts = 0;

    if (!this.isStarting) {
      this.connect();
    }
  }

  stop(): void {
    console.log('[DeepgramSTT] ⏹️ stop() called, tearing down AudioWorklet and closing WebSocket');
    this.shouldRestart = false;
    this.restartAttempts = 0;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.clearKeepAlive();
    this.teardownAudioNodes();

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      if (socket.readyState === WebSocket.OPEN) {
        try {
          // Graceful stream close notification to Deepgram
          socket.send(JSON.stringify({ type: 'CloseStream' }));
        } catch {}
        setTimeout(() => {
          try {
            socket.close();
          } catch {}
        }, 150);
      } else {
        try {
          socket.close();
        } catch {}
      }
    }

    this.currentStream = null;
  }

  onResult(cb: (result: SpeechResult) => void): void {
    this.resultCallback = cb;
  }

  onError(cb: (error: SpeechError) => void): void {
    this.errorCallback = cb;
  }

  onEnd(cb: () => void): void {
    this.endCallback = cb;
  }
}