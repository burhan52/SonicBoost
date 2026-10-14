import React from 'react';
import {
  X,
  Zap,
  Mic,
  ShieldCheck,
  Headphones,
  Laptop,
  CheckCircle2,
  Keyboard,
  Moon,
  Ear,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-zinc-300 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-zinc-100">
                AuraBoost Acoustic Engineering Guide
              </h2>
              <p className="text-xs text-zinc-400">
                How speaker volume boosting and dialogue enhancement work
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="flex flex-col gap-4 text-xs leading-relaxed text-zinc-300 max-h-[70vh] overflow-y-auto pr-1">
          {/* Keyboard Shortcuts */}
          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold font-mono text-sm">
              <Keyboard className="w-4 h-4 text-cyan-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400">Play / Pause</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px]">Space</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400">A/B Compare</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px]">B</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400">Master Mute</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px]">M</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400">Anti-Clip Limiter</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px]">L</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400">Reset All</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px]">R</kbd>
              </div>
              <div className="flex items-center justify-between bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-800">
                <span className="text-zinc-400">Boost Level</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px]">↑ / ↓</kbd>
              </div>
            </div>
          </div>

          {/* 1. Safe Volume Boosting */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>How Safe Volume Boosting Reaches 300% Without Distortion</span>
            </div>
            <p>
              Standard software amplification simply multiplies audio samples, causing hard digital square-wave clipping that sounds like harsh buzzing, crackling, and can strain small speaker diaphragms.
            </p>
            <p>
              <strong>AuraBoost</strong> uses a dual-stage DSP pipeline:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Analog Soft-Knee Saturation:</strong> Gently compresses loud transients using hyperbolic tangent shaping, generating rich musical warmth rather than harsh digital distortion.
              </li>
              <li>
                <strong className="text-zinc-200">Fast Brickwall Limiter (Safe-Peak Guard):</strong> Lookahead-fast 3ms peak compressor clamps any sudden spikes strictly below -1.0 dBFS, preventing speaker over-excursion and protecting hardware.
              </li>
            </ul>
          </div>

          {/* 2. Dialogue Clarity & Speech Intelligibility */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold font-mono text-sm">
              <Mic className="w-4 h-4" />
              <span>Dialogue Clarity, De-Esser & Mud Removal</span>
            </div>
            <p>
              Why are movies and podcasts often hard to understand? Background music, explosive sound effects, and muddy room acoustics mask human vocal articulation.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Speech Focus (2.4 kHz):</strong> Amplifies the human consonant formant spectrum responsible for crisp consonants (/t/, /k/, /s/, /p/) so whispers and quiet lines cut cleanly through dense soundtracks.
              </li>
              <li>
                <strong className="text-zinc-200 flex items-center gap-1">
                  <Ear className="w-3.5 h-3.5 text-teal-400 inline" />
                  Sibilance Tamer (6.5 kHz):
                </strong> Tames harsh, piercing &quot;S&quot; and &quot;Sh&quot; sounds that often irritate ears when media volume is boosted.
              </li>
              <li>
                <strong className="text-zinc-200 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-400 inline" />
                  Night Cinema Mode:
                </strong> Dynamic range leveler automatically boosts quiet whispers while clamping sudden explosions.
              </li>
              <li>
                <strong className="text-zinc-200">Subsonic Rumble Cleaner (65 Hz Cut):</strong> Small laptop speakers vibrate uncontrollably when asked to play 40Hz rumble from movies or air conditioning. Cutting this frees speaker power for clear vocals!
              </li>
            </ul>
          </div>

          {/* 3. Recommended Setups */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-zinc-200 font-mono font-medium">
                <Laptop className="w-4 h-4 text-amber-400" />
                <span>Laptop & Tablet Speakers</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Preset: <strong>Laptop Speaker Reviver</strong>
                <br />
                Turn on <em>Anti-Rumble (65Hz Cut)</em>, set Volume Boost to 180-220%, and keep <em>Anti-Clip Limiter</em> active.
              </p>
            </div>

            <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-zinc-200 font-mono font-medium">
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span>Headphones & Cinema</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Preset: <strong>Dialogue Clarity or Movie Night</strong>
                <br />
                Expand <em>Stereo Spatial Width</em> to 130-150% for immersive cinema surround staging.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            100% Client-side Web Audio DSP Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
