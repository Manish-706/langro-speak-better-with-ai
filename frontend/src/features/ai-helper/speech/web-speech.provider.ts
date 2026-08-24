import {
  SpeechProvider,
  SpeechResult,
  SpeechError,
  SpeechRecognitionOptions,
} from './speech-provider.interface';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export class BrowserWebSpeechProvider implements SpeechProvider {
  private recognition: any = null;
  private isRunning = false;
  private shouldRestart = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  private currentAudioTrack: MediaStreamTrack | null = null;

  private options: SpeechRecognitionOptions = {
    language: 'en-US',
    continuous: true,
    interimResults: true,
  };

  private resultCallback: ((result: SpeechResult) => void) | null = null;
  private errorCallback: ((error: SpeechError) => void) | null = null;
  private endCallback: (() => void) | null = null;

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;

    const win = window as unknown as IWindow;

    return !!(
      win.SpeechRecognition ||
      win.webkitSpeechRecognition
    );
  }

  private initInstance(): void {
    if (typeof window === 'undefined') return;

    const win = window as unknown as IWindow;

    const SpeechConstructor =
      win.SpeechRecognition ||
      win.webkitSpeechRecognition;

    if (!SpeechConstructor) return;

    // Clean up existing recognition instance
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (_) { }
    }

    const rec = new SpeechConstructor();

    rec.continuous = this.options.continuous ?? true;
    rec.interimResults = this.options.interimResults ?? true;
    rec.lang = this.options.language || 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (finalTranscript.trim() && this.resultCallback) {
        console.log(
          '[WebSpeechProvider] 🎯 Final transcript:',
          finalTranscript.trim(),
        );

        this.resultCallback({
          transcript: finalTranscript.trim(),
          isFinal: true,
        });
      } else if (interimTranscript.trim() && this.resultCallback) {
        console.log(
          '[WebSpeechProvider] ⏳ Interim transcript:',
          interimTranscript.trim(),
        );

        this.resultCallback({
          transcript: interimTranscript.trim(),
          isFinal: false,
        });
      }
    };

    rec.onerror = (event: any) => {
      if (
        event.error === 'no-speech' ||
        event.error === 'aborted'
      ) {
        return;
      }

      console.warn(
        '[WebSpeechProvider] Speech error:',
        event.error,
      );

      if (this.errorCallback) {
        this.errorCallback({
          error: event.error,
          message:
            event.message ||
            `Speech recognition error: ${event.error}`,
        });
      }
    };

    rec.onend = () => {
      this.isRunning = false;

      if (this.endCallback) {
        this.endCallback();
      }

      // Automatically restart while recognition is supposed
      // to remain active.
      if (this.shouldRestart) {
        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
        }

        this.restartTimer = setTimeout(() => {
          if (
            this.shouldRestart &&
            !this.isRunning &&
            this.recognition
          ) {
            try {
              this.startRecognition();
            } catch (err) {
              console.warn(
                '[WebSpeechProvider] restart error:',
                err,
              );
            }
          }
        }, 400);
      }
    };

    this.recognition = rec;
  }

  private startRecognition(): void {
    if (!this.recognition || this.isRunning) {
      return;
    }

    try {
      if (this.currentAudioTrack) {
        this.recognition.start(this.currentAudioTrack);
        console.log(
          '[WebSpeechProvider] ✅ Started recognition using audio track',
        );
      } else {
        this.recognition.start();
        console.log(
          '[WebSpeechProvider] ✅ Started recognition using default browser audio input',
        );
      }

      this.isRunning = true;
    } catch (err) {
      console.warn(
        '[WebSpeechProvider] start error:',
        err,
      );
    }
  }

  start(
    audioTrack?: MediaStreamTrack,
    options?: SpeechRecognitionOptions,
  ): void {
    if (!this.isSupported()) {
      return;
    }

    if (options) {
      this.options = {
        ...this.options,
        ...options,
      };
    }

    this.currentAudioTrack = audioTrack ?? null;
    this.shouldRestart = true;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    // Recreate the recognition object if the audio source changed.
    if (
      this.recognition &&
      audioTrack &&
      this.currentAudioTrack !== audioTrack
    ) {
      try {
        this.recognition.stop();
      } catch (_) { }

      this.isRunning = false;
      this.initInstance();
    }

    if (!this.recognition) {
      this.initInstance();
    }

    this.startRecognition();
  }

  stop(): void {
    this.shouldRestart = false;

    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    if (this.recognition && this.isRunning) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn(
          '[WebSpeechProvider] stop error:',
          err,
        );
      }
    }

    this.isRunning = false;
    this.currentAudioTrack = null;

    console.log(
      '[WebSpeechProvider] ⏹ Speech recognition stopped',
    );
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