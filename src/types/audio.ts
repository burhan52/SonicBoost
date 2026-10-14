export interface EqBand {
  id: string;
  frequency: number; // in Hz
  label: string;
  gain: number; // in dB (-12 to +12)
  type: BiquadFilterType;
  q: number;
}

export interface EqPreset {
  id: string;
  name: string;
  category: 'Clarity' | 'Music' | 'Media' | 'Utility';
  description: string;
  gains: number[]; // 10 band gains in dB
  clarityBoost?: number; // 0 - 100
  trebleSheen?: number; // 0 - 100
  bassPunch?: number; // 0 - 100
  rumbleCut?: boolean;
  sibilanceTamer?: number; // 0 - 100
  nightMode?: boolean;
}

export interface ClaritySettings {
  voiceClarity: number; // 0 to 100
  trebleSheen: number; // 0 to 100
  bassPunch: number; // 0 to 100
  rumbleCut: boolean; // cuts <60Hz
  spatialWidth: number; // 0 (mono) to 200 (wide), default 100
  sibilanceTamer: number; // 0 to 100 (de-esser)
  nightMode: boolean; // dynamic range compression for movies/dialogue
}

export interface BoosterSettings {
  boostMultiplier: number; // 1.0 (100%) to 3.0 (300%)
  preampGain: number; // -6 to +6 dB
  limiterActive: boolean; // Peak protection limiter
  saturationActive: boolean; // Soft-knee analog warmth
  bypassDsp: boolean; // A/B comparison bypass
  masterMute: boolean;
  masterVolume: number; // 0 to 1
  stereoBalance: number; // -100 (left) to 100 (right), 0 center
  playbackSpeed: number; // 0.5 to 2.0
}

export type VisualizerMode = 'bars' | 'curve' | 'oscilloscope' | 'spectrum-glow';

export interface VuMeterData {
  leftRms: number;
  rightRms: number;
  leftPeak: number;
  rightPeak: number;
  isClipping: boolean;
  limiterReduction: number; // dB of compression applied by limiter
}

export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number; // in seconds
  type: 'synth' | 'file' | 'mic';
  fileUrl?: string;
  isVideo?: boolean;
  videoElement?: HTMLVideoElement;
  description: string;
}
