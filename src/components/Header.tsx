import React from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  CircleDot,
  HelpCircle,
  Sliders,
  ShieldCheck,
  Disc,
} from 'lucide-react';
import { BoosterSettings } from '../types/audio';

interface HeaderProps {
  booster: BoosterSettings;
  onUpdateBooster: (update: Partial<BoosterSettings>) => void;
  onResetAll: () => void;
  onToggleHelp: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  recordedBlob: Blob | null;
  onDownloadRecording: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  booster,
  onUpdateBooster,
  onResetAll,
  onToggleHelp,
  isRecording,
  onToggleRecord,
  recordedBlob,
  onDownloadRecording,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 via-cyan-500/10 to-zinc-900 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wider text-zinc-100 font-mono">
                  AURABOOST
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  DSP ENGINE
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal">
                Speaker Volume Booster & Media Clarity Equalizer
              </p>
            </div>
          </div>

          {/* Quick Help toggle on mobile */}
          <button
            onClick={onToggleHelp}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Audio Guide & Tips"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Center / Right Control Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3 w-full md:w-auto justify-end">
          {/* A/B Compare Switch (High-visibility for immediate value verification) */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => onUpdateBooster({ bypassDsp: true })}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all flex items-center gap-1.5 ${
                booster.bypassDsp
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Bypass all processing to hear original raw audio"
            >
              <span className={`w-2 h-2 rounded-full ${booster.bypassDsp ? 'bg-amber-400' : 'bg-zinc-600'}`} />
              Raw Dry
            </button>
            <button
              onClick={() => onUpdateBooster({ bypassDsp: false })}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all flex items-center gap-1.5 ${
                !booster.bypassDsp
                  ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Activate full volume boost, clarity enhancer, and 10-band EQ"
            >
              <span className={`w-2 h-2 rounded-full ${!booster.bypassDsp ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-600'}`} />
              Boosted & Clear
            </button>
          </div>

          {/* Protection Guard status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              booster.limiterActive
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title={booster.limiterActive ? 'Anti-Clip Limiter is active' : 'Limiter is off'}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">SAFE-PEAK</span>
          </div>

          {/* Record Processed Audio */}
          {recordedBlob ? (
            <button
              onClick={onDownloadRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30 text-xs font-mono font-medium transition-colors"
              title="Download recorded enhanced audio file"
            >
              <Disc className="w-3.5 h-3.5 animate-spin" />
              Download Audio
            </button>
          ) : (
            <button
              onClick={onToggleRecord}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isRecording
                  ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
              }`}
              title={isRecording ? 'Stop recording processed audio' : 'Record processed audio output'}
            >
              <CircleDot className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-500' : 'text-zinc-400'}`} />
              {isRecording ? 'Recording...' : 'Record Output'}
            </button>
          )}

          {/* Master Mute Toggle */}
          <button
            onClick={() => onUpdateBooster({ masterMute: !booster.masterMute })}
            className={`p-2 rounded-lg border transition-colors ${
              booster.masterMute
                ? 'bg-rose-950/40 border-rose-800/50 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
            }`}
            title={booster.masterMute ? 'Unmute master' : 'Mute master'}
          >
            {booster.masterMute ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Reset All */}
          <button
            onClick={onResetAll}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            title="Reset All EQ & Booster Settings to Default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Guide / Info */}
          <button
            onClick={onToggleHelp}
            className="hidden md:flex p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            title="Acoustic Clarity Guide & Tips"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
