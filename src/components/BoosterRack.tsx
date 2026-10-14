import React from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { BoosterSettings } from '../types/audio';

interface BoosterRackProps {
  settings: BoosterSettings;
  onChange: (update: Partial<BoosterSettings>) => void;
  limiterReduction: number;
}

export const BoosterRack: React.FC<BoosterRackProps> = ({
  settings,
  onChange,
  limiterReduction,
}) => {
  // Convert multiplier (1.0 - 3.0) to percentage (100% - 300%)
  const percent = Math.round(settings.boostMultiplier * 100);
  // Calculate dB equivalent: 20 * log10(multiplier)
  const boostDb = (20 * Math.log10(settings.boostMultiplier)).toFixed(1);

  const quickPresets = [
    { label: '100% (Flat)', val: 1.0 },
    { label: '150% (+3.5dB)', val: 1.5 },
    { label: '200% (+6.0dB)', val: 2.0 },
    { label: '250% (+8.0dB)', val: 2.5 },
    { label: '300% (Max)', val: 3.0 },
  ];

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 shadow-lg flex flex-col gap-4">
      {/* Module Title */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
              SPEAKER VOLUME BOOSTER
            </h3>
            <p className="text-[11px] text-zinc-400">
              Amplify media playback up to 300% with psychoacoustic headroom
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
            +{boostDb} dB
          </span>
          <span className="text-sm font-mono font-bold text-zinc-100">
            {percent}%
          </span>
        </div>
      </div>

      {/* Main Boost Fader and Gauge Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Big Boost Slider */}
        <div className="md:col-span-8 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Standard (100%)</span>
            <span className="text-amber-400/80">Loud (+6dB)</span>
            <span className="text-rose-400/90">Max Boost (+9.5dB)</span>
          </div>

          <div className="relative py-1">
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.05"
              value={settings.boostMultiplier}
              onChange={(e) => onChange({ boostMultiplier: parseFloat(e.target.value) })}
              className="w-full h-3.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer border border-zinc-800 accent-amber-500 focus:outline-none"
            />
            {/* Visual gradient fill indication */}
            <div
              className="absolute left-0 top-2.5 h-1.5 rounded-l pointer-events-none bg-gradient-to-r from-amber-500 via-amber-400 to-rose-500 opacity-60"
              style={{ width: `${((settings.boostMultiplier - 1.0) / 2.0) * 100}%` }}
            />
          </div>

          {/* Quick Step Buttons */}
          <div className="grid grid-cols-5 gap-1.5 mt-1">
            {quickPresets.map((step) => {
              const active = Math.abs(settings.boostMultiplier - step.val) < 0.05;
              return (
                <button
                  key={step.label}
                  onClick={() => onChange({ boostMultiplier: step.val })}
                  className={`py-1 px-1 rounded text-[11px] font-mono transition-all border text-center ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {step.val * 100}%
                </button>
              );
            })}
          </div>
        </div>

        {/* Protection & Anti-Clip Limiter Meter */}
        <div className="md:col-span-4 bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between gap-2.5 h-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {settings.limiterActive ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-xs font-mono font-medium text-zinc-200">
                Anti-Clip Limiter
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.limiterActive}
                onChange={(e) => onChange({ limiterActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Gain Reduction Meter */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
              <span>Limiter Gain Reduction:</span>
              <span className={`font-semibold ${limiterReduction > 0.5 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {limiterReduction > 0 ? `-${limiterReduction.toFixed(1)} dB` : '0.0 dB'}
              </span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800 relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75"
                style={{ width: `${Math.min(100, (limiterReduction / 12) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {settings.limiterActive
                ? 'Clamps harsh square waves to prevent speaker buzz and distortion.'
                : 'Warning: Audio may clip at high boosts without limiter.'}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Controls: Preamp Trim, Analog Warmth, Stereo Widener */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/70">
        {/* Preamp Trim */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-300 mb-1.5">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
              Preamp Trim
            </span>
            <span className="text-zinc-400">
              {settings.preampGain > 0 ? `+${settings.preampGain}dB` : `${settings.preampGain}dB`}
            </span>
          </div>
          <input
            type="range"
            min="-6"
            max="6"
            step="0.5"
            value={settings.preampGain}
            onChange={(e) => onChange({ preampGain: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg accent-zinc-300 cursor-pointer"
          />
        </div>

        {/* Analog Soft Warmth */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Tube Warmth</span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Soft harmonic curve
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.saturationActive}
              onChange={(e) => onChange({ saturationActive: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Protection Status Note */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-2.5 flex items-center gap-2">
          <div className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-mono text-zinc-300">Intelligent Gain AGC</div>
            <p className="text-[10px] text-zinc-400">Dynamic crest factor balance</p>
          </div>
        </div>
      </div>
    </div>
  );
};
