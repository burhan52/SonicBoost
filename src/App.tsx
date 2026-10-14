/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MediaPlayer } from './components/MediaPlayer';
import { BoosterRack } from './components/BoosterRack';
import { ClarityRack } from './components/ClarityRack';
import { EqualizerRack } from './components/EqualizerRack';
import { VisualizerConsole } from './components/VisualizerConsole';
import { HelpModal } from './components/HelpModal';
import { audioEngine } from './audio/AudioEngine';
import {
  BoosterSettings,
  ClaritySettings,
  EqPreset,
  VuMeterData,
} from './types/audio';

export default function App() {
  // Booster & Master settings
  const [booster, setBooster] = useState<BoosterSettings>({
    boostMultiplier: 1.6, // 160% initial boost (+4.1 dB)
    preampGain: 0,
    limiterActive: true,
    saturationActive: true,
    bypassDsp: false,
    masterMute: false,
    masterVolume: 0.9,
    stereoBalance: 0,
    playbackSpeed: 1.0,
  });

  // Media Clarity settings
  const [clarity, setClarity] = useState<ClaritySettings>({
    voiceClarity: 70,
    trebleSheen: 45,
    bassPunch: 25,
    rumbleCut: true,
    spatialWidth: 110,
    sibilanceTamer: 50,
    nightMode: false,
  });

  // 10-Band EQ gains (defaults to Dialogue Clarity preset)
  const [eqGains, setEqGains] = useState<number[]>([
    -3, -2, -1, -3, 1, 3.5, 4.5, 3, 2, 0.5,
  ]);
  const [activePresetId, setActivePresetId] = useState<string | null>('dialogue-clarity');

  // Real-time VU meter data
  const [vuData, setVuData] = useState<VuMeterData>({
    leftRms: 0,
    rightRms: 0,
    leftPeak: 0,
    rightPeak: 0,
    isClipping: false,
    limiterReduction: 0,
  });

  // Audio Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Help & Shortcuts Modal state
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Update AudioEngine when booster state changes
  const handleUpdateBooster = useCallback((update: Partial<BoosterSettings>) => {
    setBooster((prev) => {
      const next = { ...prev, ...update };
      audioEngine.setBoosterSettings(next);
      return next;
    });
  }, []);

  // Update AudioEngine when clarity state changes
  const handleUpdateClarity = useCallback((update: Partial<ClaritySettings>) => {
    setClarity((prev) => {
      const next = { ...prev, ...update };
      audioEngine.setClaritySettings(next);
      return next;
    });
  }, []);

  // Update EQ single band
  const handleGainChange = useCallback((index: number, val: number) => {
    setEqGains((prev) => {
      const next = [...prev];
      next[index] = val;
      audioEngine.setEqBandGain(index, val);
      return next;
    });
    setActivePresetId(null);
  }, []);

  // Apply full EQ preset
  const handleApplyPreset = useCallback((preset: EqPreset) => {
    setEqGains([...preset.gains]);
    audioEngine.setEqGains(preset.gains);
    setActivePresetId(preset.id);

    // Apply specialized preset settings if present
    setClarity((prev) => {
      const next: ClaritySettings = {
        ...prev,
        voiceClarity: preset.clarityBoost ?? prev.voiceClarity,
        trebleSheen: preset.trebleSheen ?? prev.trebleSheen,
        bassPunch: preset.bassPunch ?? prev.bassPunch,
        rumbleCut: preset.rumbleCut ?? prev.rumbleCut,
        sibilanceTamer: preset.sibilanceTamer ?? prev.sibilanceTamer,
        nightMode: preset.nightMode ?? prev.nightMode,
      };
      audioEngine.setClaritySettings(next);
      return next;
    });
  }, []);

  // Reset all parameters to initial clean default
  const handleResetAll = useCallback(() => {
    const defaultBooster: BoosterSettings = {
      boostMultiplier: 1.0,
      preampGain: 0,
      limiterActive: true,
      saturationActive: true,
      bypassDsp: false,
      masterMute: false,
      masterVolume: 0.9,
      stereoBalance: 0,
      playbackSpeed: 1.0,
    };
    const defaultClarity: ClaritySettings = {
      voiceClarity: 0,
      trebleSheen: 0,
      bassPunch: 0,
      rumbleCut: false,
      spatialWidth: 100,
      sibilanceTamer: 0,
      nightMode: false,
    };
    const flatGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    setBooster(defaultBooster);
    setClarity(defaultClarity);
    setEqGains(flatGains);
    setActivePresetId('flat-reference');

    audioEngine.setBoosterSettings(defaultBooster);
    audioEngine.setClaritySettings(defaultClarity);
    audioEngine.setEqGains(flatGains);
  }, []);

  // Toggle audio recording of processed stream
  const handleToggleRecord = async () => {
    if (isRecording) {
      const blob = await audioEngine.stopRecording();
      setIsRecording(false);
      if (blob) {
        setRecordedBlob(blob);
      }
    } else {
      await audioEngine.initContext();
      const started = audioEngine.startRecording();
      if (started) {
        setIsRecording(true);
        setRecordedBlob(null);
      }
    }
  };

  const handleDownloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auraboost-enhanced-audio-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setRecordedBlob(null);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (audioEngine.isBufferPlaying) {
          audioEngine.pauseBuffer();
        } else {
          audioEngine.resumeBuffer('muffled');
        }
      } else if (e.key === 'b' || e.key === 'B') {
        handleUpdateBooster({ bypassDsp: !booster.bypassDsp });
      } else if (e.key === 'm' || e.key === 'M') {
        handleUpdateBooster({ masterMute: !booster.masterMute });
      } else if (e.key === 'l' || e.key === 'L') {
        handleUpdateBooster({ limiterActive: !booster.limiterActive });
      } else if (e.key === 'r' || e.key === 'R') {
        handleResetAll();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUpdateBooster({
          boostMultiplier: Math.min(3.0, booster.boostMultiplier + 0.1),
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleUpdateBooster({
          boostMultiplier: Math.max(1.0, booster.boostMultiplier - 0.1),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [booster, handleUpdateBooster, handleResetAll]);

  // Poll VU Meter at 60fps
  useEffect(() => {
    let animId: number;

    const pollMeters = () => {
      const data = audioEngine.getVuMeterData();
      setVuData(data);
      animId = requestAnimationFrame(pollMeters);
    };

    animId = requestAnimationFrame(pollMeters);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top App Header */}
      <Header
        booster={booster}
        onUpdateBooster={handleUpdateBooster}
        onResetAll={handleResetAll}
        onToggleHelp={() => setIsHelpOpen(true)}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        recordedBlob={recordedBlob}
        onDownloadRecording={handleDownloadRecording}
      />

      {/* Main Studio Console Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Row 1: Media Player & Source Feed */}
        <MediaPlayer
          onAudioStart={() => audioEngine.initContext()}
          masterVolume={booster.masterVolume}
          onVolumeChange={(vol) => handleUpdateBooster({ masterVolume: vol })}
          playbackSpeed={booster.playbackSpeed}
          onSpeedChange={(speed) => handleUpdateBooster({ playbackSpeed: speed })}
        />

        {/* Row 2: Booster Rack & Clarity Enhancer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BoosterRack
            settings={booster}
            onChange={handleUpdateBooster}
            limiterReduction={vuData.limiterReduction}
          />
          <ClarityRack
            settings={clarity}
            onChange={handleUpdateClarity}
          />
        </div>

        {/* Row 3: 10-Band Precision Equalizer (Interactive Drag & Drop curve) */}
        <EqualizerRack
          gains={eqGains}
          onGainChange={handleGainChange}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
        />

        {/* Row 4: Real-time Audio Spectrum & VU Meter Console */}
        <VisualizerConsole vuData={vuData} />
      </main>

      {/* Acoustic Engineering & Quick Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 px-4 py-4 text-center text-xs text-zinc-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AuraBoost · 32-bit Floating Web Audio DSP Studio Engine</span>
          <span>Zero Latency · True Mid-Side Stereo Spatializer</span>
        </div>
      </footer>
    </div>
  );
}
