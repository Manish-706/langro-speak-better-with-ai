/**
 * AudioWorkletProcessor for Real-Time 16kHz Linear16 PCM Streaming
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = (options && options.processorOptions && options.processorOptions.targetSampleRate) || 16000;
    this.targetChunkSize = (options && options.processorOptions && options.processorOptions.chunkSize) || 512; // 32ms @ 16kHz

    this.inputSampleRate = sampleRate; // Global AudioWorklet context sampleRate
    this.ratio = this.inputSampleRate / this.targetSampleRate;

    this.buffer = new Int16Array(this.targetChunkSize);
    this.bufferIndex = 0;

    this.resampleOffset = 0.0;
    this.lastSample = 0.0;
    this.isMuted = false;
    this.isPaused = false;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data) {
        if (typeof data.isMuted === 'boolean') this.isMuted = data.isMuted;
        if (typeof data.isPaused === 'boolean') this.isPaused = data.isPaused;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || this.isPaused) return true;

    const channelData = input[0]; // Channel 0 (Mono)
    const inputLength = channelData.length;

    if (this.isMuted) return true;

    if (Math.abs(this.inputSampleRate - this.targetSampleRate) < 1) {
      // 1:1 Sample Rate (Context is already 16kHz)
      for (let i = 0; i < inputLength; i++) {
        let s = channelData[i];
        s = Math.max(-1, Math.min(1, s));
        this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;

        if (this.bufferIndex >= this.targetChunkSize) {
          this.flushBuffer();
        }
      }
    } else {
      // Linear Interpolation Resampling (e.g. 48kHz / 44.1kHz -> 16kHz)
      let i = this.resampleOffset;
      while (i < inputLength) {
        const indexPrev = Math.floor(i);
        const indexNext = Math.min(indexPrev + 1, inputLength - 1);
        const fraction = i - indexPrev;

        const samplePrev = indexPrev < 0 ? this.lastSample : channelData[indexPrev];
        const sampleNext = channelData[indexNext];

        let s = samplePrev + fraction * (sampleNext - samplePrev);
        s = Math.max(-1, Math.min(1, s));

        this.buffer[this.bufferIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;

        if (this.bufferIndex >= this.targetChunkSize) {
          this.flushBuffer();
        }

        i += this.ratio;
      }

      this.resampleOffset = i - inputLength;
      this.lastSample = channelData[inputLength - 1];
    }

    return true;
  }

  flushBuffer() {
    // Send PCM buffer as zero-copy Transferable ArrayBuffer
    const pcmBuffer = this.buffer.buffer.slice(0, this.bufferIndex * 2);
    this.port.postMessage(pcmBuffer, [pcmBuffer]);
    this.bufferIndex = 0;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
