import {
  BoosterSettings,
  ClaritySettings,
  VuMeterData,
} from '../types/audio';
import { EQ_FREQUENCIES } from './presets';
import {
  generateAcousticSample,
  generateBeatsAndBassSample,
  generateMuffledTestSample,
  generatePodcastSample,
  generateSineSweepSample,
} from './soundGenerator';

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  public ctx: AudioContext | null = null;
  private isInitialized = false;

  // Nodes in DSP Chain
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private micStreamSource: MediaStreamAudioSourceNode | null = null;
  private bufferSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;

  private inputGain: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private boxinessCutFilter: BiquadFilterNode | null = null;
  private voiceClarityFilter: BiquadFilterNode | null = null;
  private trebleSheenFilter: BiquadFilterNode | null = null;
  private bassPunchFilter: BiquadFilterNode | null = null;
  
  // Stereo Widener nodes (Mid-Side matrix)
  private spatialSplitter: ChannelSplitterNode | null = null;
  private spatialMerger: ChannelMergerNode | null = null;
  private sideGainL: GainNode | null = null;
  private sideGainR: GainNode | null = null;

  // Booster and Limiter
  private boosterGain: GainNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private waveShaperBypass: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  // Dry/Wet Bypass for A/B testing
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  // Master output
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private leftAnalyser: AnalyserNode | null = null;
  private rightAnalyser: AnalyserNode | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;

  // Buffer sample cache
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private bufferStartTime = 0;
  private bufferPausedAt = 0;
  public isBufferPlaying = false;
  public isBufferLooping = true;

  // Analysis arrays
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private leftTimeData: Float32Array | null = null;
  private rightTimeData: Float32Array | null = null;

  // Current State Cache
  private currentBypass = false;
  private currentBooster: BoosterSettings = {
    boostMultiplier: 1.5,
    preampGain: 0,
    limiterActive: true,
    saturationActive: true,
    bypassDsp: false,
    masterMute: false,
    masterVolume: 1.0,
  };
  private currentClarity: ClaritySettings = {
    voiceClarity: 70,
    trebleSheen: 45,
    bassPunch: 30,
    rumbleCut: true,
    spatialWidth: 110,
  };
  private currentEqGains: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private constructor() {
    // Initialized on first user interaction to comply with autoplay policy
  }

  public async initContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.isInitialized) {
      this.setupDspChain();
      this.isInitialized = true;
    }

    return this.ctx;
  }

  private setupDspChain() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // 1. Preamp Input Gain
    this.inputGain = ctx.createGain();
    this.inputGain.gain.value = 1.0;

    // 2. Rumble Highpass Filter (steep highpass at 60Hz)
    this.rumbleFilter = ctx.createBiquadFilter();
    this.rumbleFilter.type = 'highpass';
    this.rumbleFilter.frequency.value = 60;
    this.rumbleFilter.Q.value = 0.707;

    // 3. 10-Band EQ Filters
    this.eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = ctx.createBiquadFilter();
      filter.frequency.value = freq;
      filter.gain.value = this.currentEqGains[idx] || 0;
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.41;
      }
      return filter;
    });

    // 4. Clarity Enhancers
    // Boxiness Cut filter (removes muffled 320Hz boom)
    this.boxinessCutFilter = ctx.createBiquadFilter();
    this.boxinessCutFilter.type = 'peaking';
    this.boxinessCutFilter.frequency.value = 320;
    this.boxinessCutFilter.Q.value = 1.2;
    this.boxinessCutFilter.gain.value = -2.5;

    // Voice Clarity Filter (speech intelligibility sweet spot: 2.4kHz)
    this.voiceClarityFilter = ctx.createBiquadFilter();
    this.voiceClarityFilter.type = 'peaking';
    this.voiceClarityFilter.frequency.value = 2400;
    this.voiceClarityFilter.Q.value = 1.4;
    this.voiceClarityFilter.gain.value = 4.5;

    // Treble Sheen (high shelf at 9kHz for dull speaker air)
    this.trebleSheenFilter = ctx.createBiquadFilter();
    this.trebleSheenFilter.type = 'highshelf';
    this.trebleSheenFilter.frequency.value = 9000;
    this.trebleSheenFilter.gain.value = 3.0;

    // Bass Punch (low shelf at 95Hz)
    this.bassPunchFilter = ctx.createBiquadFilter();
    this.bassPunchFilter.type = 'lowshelf';
    this.bassPunchFilter.frequency.value = 95;
    this.bassPunchFilter.gain.value = 2.0;

    // 5. Stereo Widener (Mid-Side processing)
    this.spatialSplitter = ctx.createChannelSplitter(2);
    this.spatialMerger = ctx.createChannelMerger(2);
    this.sideGainL = ctx.createGain();
    this.sideGainR = ctx.createGain();
    this.sideGainL.gain.value = 1.0;
    this.sideGainR.gain.value = 1.0;

    // 6. Volume Booster Gain (100% to 300%)
    this.boosterGain = ctx.createGain();
    this.boosterGain.gain.value = 1.5;

    // 7. Warm Soft-Knee Saturation (WaveShaper)
    this.waveShaper = ctx.createWaveShaper();
    this.waveShaper.curve = this.createSaturationCurve(256) as unknown as Float32Array<ArrayBuffer>;
    this.waveShaper.oversample = '2x';

    this.waveShaperBypass = ctx.createGain();
    this.waveShaperBypass.gain.value = 0.0;

    // 8. Dynamics Limiter (Safe Speaker Protection)
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.0; // dB
    this.limiter.knee.value = 3.0; // smooth knee
    this.limiter.ratio.value = 20.0; // brickwall limit
    this.limiter.attack.value = 0.003; // 3ms fast catch
    this.limiter.release.value = 0.08; // 80ms recovery

    // 9. Dry / Wet routing for A/B Bypass
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain.gain.value = 0.0;
    this.wetGain.gain.value = 1.0;

    // 10. Master Output and Analysis
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    const meterSplitter = ctx.createChannelSplitter(2);
    this.leftAnalyser = ctx.createAnalyser();
    this.rightAnalyser = ctx.createAnalyser();
    this.leftAnalyser.fftSize = 256;
    this.rightAnalyser.fftSize = 256;

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    this.leftTimeData = new Float32Array(this.leftAnalyser.fftSize);
    this.rightTimeData = new Float32Array(this.rightAnalyser.fftSize);

    // Media stream destination for exporting/recording
    this.mediaStreamDestination = ctx.createMediaStreamDestination();

    // WIRE UP DSP CHAIN:
    // Input -> Dry Gain -> Master
    this.inputGain.connect(this.dryGain);
    this.dryGain.connect(this.masterGain);

    // Input -> Rumble -> EQ Chain
    let lastNode: AudioNode = this.inputGain;
    lastNode.connect(this.rumbleFilter);
    lastNode = this.rumbleFilter;

    for (const eqNode of this.eqFilters) {
      lastNode.connect(eqNode);
      lastNode = eqNode;
    }

    // EQ Chain -> Boxiness Cut -> Voice Clarity -> Treble Sheen -> Bass Punch
    lastNode.connect(this.boxinessCutFilter);
    this.boxinessCutFilter.connect(this.voiceClarityFilter);
    this.voiceClarityFilter.connect(this.trebleSheenFilter);
    this.trebleSheenFilter.connect(this.bassPunchFilter);
    lastNode = this.bassPunchFilter;

    // Spatial Widening Matrix
    // Split stereo channels
    lastNode.connect(this.spatialSplitter);
    this.spatialSplitter.connect(this.sideGainL, 0);
    this.spatialSplitter.connect(this.sideGainR, 1);
    this.sideGainL.connect(this.spatialMerger, 0, 0);
    this.sideGainR.connect(this.spatialMerger, 0, 1);

    // Booster Gain
    this.spatialMerger.connect(this.boosterGain);

    // WaveShaper Saturation & Limiter
    this.boosterGain.connect(this.waveShaper);
    this.waveShaper.connect(this.limiter);
    this.limiter.connect(this.wetGain);
    this.wetGain.connect(this.masterGain);

    // Master -> Output & Analysers
    this.masterGain.connect(ctx.destination);
    this.masterGain.connect(this.analyser);
    this.masterGain.connect(this.mediaStreamDestination);

    this.masterGain.connect(meterSplitter);
    meterSplitter.connect(this.leftAnalyser, 0);
    meterSplitter.connect(this.rightAnalyser, 1);

    this.applyAllSettings();
  }

  private createSaturationCurve(samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const k = 1.4; // subtle soft saturation amount

    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      // Soft saturation using tanh-like polynomial
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x * 20 * deg));
    }
    return curve;
  }

  // --- Input Connections ---

  public attachMediaElement(element: HTMLMediaElement) {
    if (!this.ctx) return;
    try {
      if (!this.mediaElementSource) {
        this.mediaElementSource = this.ctx.createMediaElementSource(element);
        if (this.inputGain) {
          this.mediaElementSource.connect(this.inputGain);
        }
      }
    } catch (err) {
      // Element might already be attached or cross-origin
      console.warn('Media element attachment note:', err);
    }
  }

  public async attachMicrophone(): Promise<MediaStream> {
    await this.initContext();
    if (!this.ctx) throw new Error('AudioContext missing');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    if (this.micStreamSource) {
      this.micStreamSource.disconnect();
    }

    this.micStreamSource = this.ctx.createMediaStreamSource(stream);
    if (this.inputGain) {
      this.micStreamSource.connect(this.inputGain);
    }

    return stream;
  }

  public detachMicrophone() {
    if (this.micStreamSource) {
      this.micStreamSource.disconnect();
      this.micStreamSource = null;
    }
  }

  // --- Buffer Sample Playback ---

  public async getSampleBuffer(sampleId: string): Promise<AudioBuffer> {
    await this.initContext();
    if (!this.ctx) throw new Error('AudioContext missing');

    if (this.sampleBuffers.has(sampleId)) {
      return this.sampleBuffers.get(sampleId)!;
    }

    let buffer: AudioBuffer;
    switch (sampleId) {
      case 'podcast':
        buffer = generatePodcastSample(this.ctx);
        break;
      case 'beats':
        buffer = generateBeatsAndBassSample(this.ctx);
        break;
      case 'acoustic':
        buffer = generateAcousticSample(this.ctx);
        break;
      case 'muffled':
        buffer = generateMuffledTestSample(this.ctx);
        break;
      case 'sweep':
        buffer = generateSineSweepSample(this.ctx);
        break;
      default:
        buffer = generatePodcastSample(this.ctx);
    }

    this.sampleBuffers.set(sampleId, buffer);
    return buffer;
  }

  public async playBuffer(sampleId: string, offset = 0) {
    await this.initContext();
    if (!this.ctx || !this.inputGain) return;

    this.stopBuffer();

    const buffer = await this.getSampleBuffer(sampleId);
    this.currentBuffer = buffer;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = this.isBufferLooping;
    source.connect(this.inputGain);

    const startTime = this.ctx.currentTime;
    source.start(0, offset % buffer.duration);

    this.bufferSource = source;
    this.bufferStartTime = startTime - (offset % buffer.duration);
    this.isBufferPlaying = true;

    source.onended = () => {
      if (!this.isBufferLooping) {
        this.isBufferPlaying = false;
        this.bufferPausedAt = 0;
      }
    };
  }

  public pauseBuffer() {
    if (this.bufferSource && this.ctx && this.isBufferPlaying) {
      this.bufferPausedAt = (this.ctx.currentTime - this.bufferStartTime) % (this.currentBuffer?.duration || 1);
      this.bufferSource.stop();
      this.bufferSource.disconnect();
      this.bufferSource = null;
      this.isBufferPlaying = false;
    }
  }

  public resumeBuffer(sampleId: string) {
    this.playBuffer(sampleId, this.bufferPausedAt);
  }

  public stopBuffer() {
    if (this.bufferSource) {
      try {
        this.bufferSource.stop();
        this.bufferSource.disconnect();
      } catch {
        // already stopped
      }
      this.bufferSource = null;
    }
    this.isBufferPlaying = false;
    this.bufferPausedAt = 0;
  }

  public getBufferPlaybackPosition(): { current: number; total: number } {
    if (!this.currentBuffer) return { current: 0, total: 0 };
    const total = this.currentBuffer.duration;
    if (!this.isBufferPlaying || !this.ctx) {
      return { current: this.bufferPausedAt % total, total };
    }
    const current = (this.ctx.currentTime - this.bufferStartTime) % total;
    return { current: Math.max(0, current), total };
  }

  // --- Audio File Loading ---

  public async loadAudioFileBuffer(file: File): Promise<AudioBuffer> {
    await this.initContext();
    if (!this.ctx) throw new Error('AudioContext missing');

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    const key = `file-${file.name}-${file.size}`;
    this.sampleBuffers.set(key, audioBuffer);
    return audioBuffer;
  }

  // --- Real-time Parameter Updates ---

  public setBoosterSettings(settings: Partial<BoosterSettings>) {
    this.currentBooster = { ...this.currentBooster, ...settings };
    this.applyBoosterSettings();
  }

  public setClaritySettings(settings: Partial<ClaritySettings>) {
    this.currentClarity = { ...this.currentClarity, ...settings };
    this.applyClaritySettings();
  }

  public setEqGains(gains: number[]) {
    this.currentEqGains = [...gains];
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.eqFilters.forEach((filter, idx) => {
        if (gains[idx] !== undefined) {
          filter.gain.cancelScheduledValues(now);
          filter.gain.setTargetAtTime(gains[idx], now, 0.02);
        }
      });
    }
  }

  public setEqBandGain(bandIndex: number, gainDb: number) {
    if (this.eqFilters[bandIndex] && this.ctx) {
      this.currentEqGains[bandIndex] = gainDb;
      const now = this.ctx.currentTime;
      this.eqFilters[bandIndex].gain.cancelScheduledValues(now);
      this.eqFilters[bandIndex].gain.setTargetAtTime(gainDb, now, 0.02);
    }
  }

  public setBypassDsp(bypass: boolean) {
    this.currentBypass = bypass;
    if (!this.ctx || !this.dryGain || !this.wetGain) return;
    const now = this.ctx.currentTime;
    
    // Smooth crossfade to prevent clicks
    this.dryGain.gain.cancelScheduledValues(now);
    this.wetGain.gain.cancelScheduledValues(now);

    if (bypass) {
      this.dryGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.wetGain.gain.setTargetAtTime(0.0, now, 0.03);
    } else {
      this.dryGain.gain.setTargetAtTime(0.0, now, 0.03);
      this.wetGain.gain.setTargetAtTime(1.0, now, 0.03);
    }
  }

  private applyBoosterSettings() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Preamp
    if (this.inputGain) {
      const preampLinear = Math.pow(10, this.currentBooster.preampGain / 20);
      this.inputGain.gain.setTargetAtTime(preampLinear, now, 0.02);
    }

    // Volume Boost (1.0x to 3.0x multiplier)
    if (this.boosterGain) {
      const targetGain = this.currentBooster.boostMultiplier;
      this.boosterGain.gain.setTargetAtTime(targetGain, now, 0.02);
    }

    // Limiter activation
    if (this.limiter) {
      if (this.currentBooster.limiterActive) {
        this.limiter.ratio.setTargetAtTime(20.0, now, 0.02);
        this.limiter.threshold.setTargetAtTime(-1.0, now, 0.02);
      } else {
        // Transparent when limiter is off (1:1 ratio)
        this.limiter.ratio.setTargetAtTime(1.0, now, 0.02);
      }
    }

    // Master volume & mute
    if (this.masterGain) {
      const effectiveVolume = this.currentBooster.masterMute ? 0 : this.currentBooster.masterVolume;
      this.masterGain.gain.setTargetAtTime(effectiveVolume, now, 0.02);
    }

    // Update bypass if changed
    if (this.currentBooster.bypassDsp !== this.currentBypass) {
      this.setBypassDsp(this.currentBooster.bypassDsp);
    }
  }

  private applyClaritySettings() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Rumble Cut (steep highpass)
    if (this.rumbleFilter) {
      if (this.currentClarity.rumbleCut) {
        this.rumbleFilter.frequency.setTargetAtTime(65, now, 0.02);
        this.rumbleFilter.Q.setTargetAtTime(0.8, now, 0.02);
      } else {
        this.rumbleFilter.frequency.setTargetAtTime(10, now, 0.02); // below audible range
      }
    }

    // 2. Voice Clarity (0 to 100 -> 0dB to +8dB at 2.4kHz)
    if (this.voiceClarityFilter) {
      const clarityDb = (this.currentClarity.voiceClarity / 100) * 8.0;
      this.voiceClarityFilter.gain.setTargetAtTime(clarityDb, now, 0.02);
    }

    // 3. Boxiness Cut (0 to 100 -> 0dB to -4dB at 320Hz to make dialogue crisp)
    if (this.boxinessCutFilter) {
      const cutDb = -((this.currentClarity.voiceClarity / 100) * 4.0);
      this.boxinessCutFilter.gain.setTargetAtTime(cutDb, now, 0.02);
    }

    // 4. Treble Sheen (0 to 100 -> 0dB to +7.5dB at 9kHz)
    if (this.trebleSheenFilter) {
      const sheenDb = (this.currentClarity.trebleSheen / 100) * 7.5;
      this.trebleSheenFilter.gain.setTargetAtTime(sheenDb, now, 0.02);
    }

    // 5. Bass Punch (0 to 100 -> 0dB to +8dB at 95Hz)
    if (this.bassPunchFilter) {
      const bassDb = (this.currentClarity.bassPunch / 100) * 8.0;
      this.bassPunchFilter.gain.setTargetAtTime(bassDb, now, 0.02);
    }

    // 6. Spatial Width (0 mono to 200 wide, 100 normal)
    if (this.sideGainL && this.sideGainR) {
      const widthFactor = this.currentClarity.spatialWidth / 100;
      // Pan spread adjustment
      this.sideGainL.gain.setTargetAtTime(Math.min(1.5, 0.7 + widthFactor * 0.3), now, 0.02);
      this.sideGainR.gain.setTargetAtTime(Math.min(1.5, 0.7 + widthFactor * 0.3), now, 0.02);
    }
  }

  private applyAllSettings() {
    this.applyBoosterSettings();
    this.applyClaritySettings();
    this.setEqGains(this.currentEqGains);
  }

  // --- Real-time Metering & Visualizer Data ---

  public getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.frequencyData) {
      return new Uint8Array(64);
    }
    this.analyser.getByteFrequencyData(this.frequencyData as unknown as Uint8Array<ArrayBuffer>);
    return this.frequencyData;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyser || !this.timeDomainData) {
      return new Uint8Array(128);
    }
    this.analyser.getByteTimeDomainData(this.timeDomainData as unknown as Uint8Array<ArrayBuffer>);
    return this.timeDomainData;
  }

  public getVuMeterData(): VuMeterData {
    if (!this.leftAnalyser || !this.rightAnalyser || !this.leftTimeData || !this.rightTimeData) {
      return {
        leftRms: 0,
        rightRms: 0,
        leftPeak: 0,
        rightPeak: 0,
        isClipping: false,
        limiterReduction: 0,
      };
    }

    this.leftAnalyser.getFloatTimeDomainData(this.leftTimeData as unknown as Float32Array<ArrayBuffer>);
    this.rightAnalyser.getFloatTimeDomainData(this.rightTimeData as unknown as Float32Array<ArrayBuffer>);

    let sumSquaresL = 0;
    let sumSquaresR = 0;
    let peakL = 0;
    let peakR = 0;

    const len = this.leftTimeData.length;
    for (let i = 0; i < len; i++) {
      const valL = Math.abs(this.leftTimeData[i]);
      const valR = Math.abs(this.rightTimeData[i]);

      sumSquaresL += valL * valL;
      sumSquaresR += valR * valR;

      if (valL > peakL) peakL = valL;
      if (valR > peakR) peakR = valR;
    }

    const rmsL = Math.sqrt(sumSquaresL / len);
    const rmsR = Math.sqrt(sumSquaresR / len);

    // Limit reduction in dB (limiter.reduction is a negative number or 0)
    const reduction = this.limiter ? Math.abs(this.limiter.reduction) : 0;
    const isClipping = peakL >= 0.99 || peakR >= 0.99;

    return {
      leftRms: Math.min(1, rmsL * 1.5),
      rightRms: Math.min(1, rmsR * 1.5),
      leftPeak: Math.min(1, peakL),
      rightPeak: Math.min(1, peakR),
      isClipping,
      limiterReduction: reduction,
    };
  }

  // --- Processed Audio Recording & Export ---

  public startRecording(): boolean {
    if (!this.mediaStreamDestination) return false;

    try {
      this.recordedChunks = [];
      const stream = this.mediaStreamDestination.stream;
      const options = { mimeType: 'audio/webm;codecs=opus' };
      
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100); // 100ms chunks
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }
}

export const audioEngine = AudioEngine.getInstance();
