import React from 'react';
import {
  Sparkles,
  Mic,
  Wind,
  Disc3,
  VolumeX,
  Compass,
  Moon,
  Ear,
} from 'lucide-react';
import { ClaritySettings } from '../types/audio';

interface ClarityRackProps {
  settings: ClaritySettings;
  onChange: (update: Partial<ClaritySettings>) => void;
}

export const ClarityRack: React.FC<ClarityRackProps> = ({
  settings,
  onChange,
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 shadow-lg flex flex-col gap-4">
      {/* Section Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
              MEDIA CLARITY & SPEECH ENHANCER
            </h3>
            <p className="text-[11px] text-zinc-400">
              Dialogue focus, sibilance tamer, boxiness de-muffler, and exciter
            </p>
          </div>
        </div>

        {/* Quick Mode Toggles: Anti-Rumble and Night Mode */}
        <div className="flex items-center gap-2">
          {/* Night Mode Toggle */}
          <button
            onClick={() => onChange({ nightMode: !settings.nightMode })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
              settings.nightMode
                ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Auto-levels whispers and tames loud explosions for night movie watching"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Night Cinema</span>
          </button>

          {/* Rumble Cut Quick Toggle */}
          <button
            onClick={() => onChange({ rumbleCut: !settings.rumbleCut })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
              settings.rumbleCut
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Cuts sub-65Hz subsonic rumble and laptop chassis buzz"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Anti-Rumble</span>
          </button>
        </div>
      </div>

      {/* Primary Clarity Faders in Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Dialogue & Voice Clarity */}
        <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-zinc-200">
                  Dialogue Focus
                </div>
                <div className="text-[10px] text-zinc-500">
                  2.4kHz Speech Boost
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {settings.voiceClarity}%
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.voiceClarity}
              onChange={(e) => onChange({ voiceClarity: parseInt(e.target.value) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Natural</span>
              <span>Cinema Clear</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-tight">
            Elevates whispers and movie dialogue over sound effects and background noise.
          </p>
        </div>

        {/* 2. Sibilance Tamer / De-Esser */}
        <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Ear className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-zinc-200">
                  Sibilance Tamer
                </div>
                <div className="text-[10px] text-zinc-500">
                  6.5kHz De-Esser
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-teal-400">
              {settings.sibilanceTamer}%
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.sibilanceTamer}
              onChange={(e) => onChange({ sibilanceTamer: parseInt(e.target.value) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Off</span>
              <span>Smooth Vocals</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-tight">
            Removes harsh & piercing &quot;S&quot; sounds that can fatigue ears at loud volumes.
          </p>
        </div>

        {/* 3. Dull Speaker Revival (Treble Air & Sheen) */}
        <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-zinc-200">
                  Treble Air & Sheen
                </div>
                <div className="text-[10px] text-zinc-500">
                  9kHz High-Shelf
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              {settings.trebleSheen}%
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.trebleSheen}
              onChange={(e) => onChange({ trebleSheen: parseInt(e.target.value) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Warm</span>
              <span>Crystal Air</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-tight">
            Restores clarity and open sparkle to cheap, muffled, or aged speaker drivers.
          </p>
        </div>

        {/* 4. Deep Bass Punch & Harmonics */}
        <div className="bg-zinc-950/60 border border-zinc-800/90 rounded-lg p-3.5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Disc3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-zinc-200">
                  Bass Body & Punch
                </div>
                <div className="text-[10px] text-zinc-500">
                  95Hz Low-End Body
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {settings.bassPunch}%
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.bassPunch}
              onChange={(e) => onChange({ bassPunch: parseInt(e.target.value) })}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Lean</span>
              <span>Deep Punch</span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-tight">
            Generates tight low-end weight without muddying vocal frequencies.
          </p>
        </div>
      </div>

      {/* Spatial Width Bar */}
      <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
              <span>Stereo Soundstage Spatializer</span>
              <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-1.5 rounded">
                {settings.spatialWidth}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Mid-Side acoustic matrix expands perceived room depth and headphone separation
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64 flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">Mono</span>
          <input
            type="range"
            min="0"
            max="200"
            step="5"
            value={settings.spatialWidth}
            onChange={(e) => onChange({ spatialWidth: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
          />
          <span className="text-[10px] font-mono text-zinc-500">3D Wide</span>
        </div>
      </div>
    </div>
  );
};
