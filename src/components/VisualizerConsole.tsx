import React, { useRef, useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Waves,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import { VisualizerMode, VuMeterData } from '../types/audio';

interface VisualizerConsoleProps {
  vuData: VuMeterData;
}

export const VisualizerConsole: React.FC<VisualizerConsoleProps> = ({
  vuData,
}) => {
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Peak hold references for VU meters
  const [leftPeakHold, setLeftPeakHold] = useState(0);
  const [rightPeakHold, setRightPeakHold] = useState(0);

  useEffect(() => {
    if (vuData.leftPeak > leftPeakHold) {
      setLeftPeakHold(vuData.leftPeak);
    } else {
      const timeout = setTimeout(() => {
        setLeftPeakHold((prev) => Math.max(vuData.leftPeak, prev * 0.95));
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [vuData.leftPeak, leftPeakHold]);

  useEffect(() => {
    if (vuData.rightPeak > rightPeakHold) {
      setRightPeakHold(vuData.rightPeak);
    } else {
      const timeout = setTimeout(() => {
        setRightPeakHold((prev) => Math.max(vuData.rightPeak, prev * 0.95));
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [vuData.rightPeak, rightPeakHold]);

  // Real-time Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Peak caps cache for bar mode
    const peakCaps: number[] = new Array(64).fill(0);

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(39, 39, 42, 0.4)';
      ctx.lineWidth = 0.5;
      for (let y = 0; y < height; y += height / 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (mode === 'bars') {
        const freqData = audioEngine.getFrequencyData();
        const numBars = 48;
        const barWidth = (width - (numBars - 1) * 2) / numBars;

        for (let i = 0; i < numBars; i++) {
          // Logarithmic distribution to spread low/mid/highs nicely
          const binIndex = Math.floor(Math.pow(i / numBars, 1.8) * (freqData.length * 0.6));
          const val = freqData[binIndex] || 0;
          const barHeight = Math.max(2, (val / 255) * (height - 12));
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Decay peak cap
          if (barHeight > peakCaps[i]) {
            peakCaps[i] = barHeight;
          } else {
            peakCaps[i] = Math.max(2, peakCaps[i] - 1.2);
          }

          // Bar gradient
          const gradient = ctx.createLinearGradient(0, height, 0, y);
          gradient.addColorStop(0, '#06b6d4'); // cyan
          gradient.addColorStop(0.6, '#10b981'); // emerald
          gradient.addColorStop(0.9, '#f59e0b'); // amber
          gradient.addColorStop(1, '#f43f5e'); // rose

          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Draw floating peak cap
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x, height - peakCaps[i] - 2, barWidth, 1.5);
        }
      } else if (mode === 'curve') {
        const freqData = audioEngine.getFrequencyData();
        const numPoints = 64;

        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let i = 0; i < numPoints; i++) {
          const binIndex = Math.floor(Math.pow(i / numPoints, 1.8) * (freqData.length * 0.6));
          const val = freqData[binIndex] || 0;
          const pointHeight = (val / 255) * (height - 10);
          const x = (i / (numPoints - 1)) * width;
          const y = height - pointHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Fill under curve
        const lastX = width;
        ctx.lineTo(lastX, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
        grad.addColorStop(1, 'rgba(34, 211, 238, 0.02)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'oscilloscope') {
        const timeData = audioEngine.getTimeDomainData();
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#10b981'; // emerald-500
        ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
        ctx.shadowBlur = 4;

        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (mode === 'spectrum-glow') {
        const freqData = audioEngine.getFrequencyData();
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.35;

        ctx.beginPath();
        const numRays = 48;
        for (let i = 0; i < numRays; i++) {
          const angle = (i / numRays) * Math.PI * 2;
          const bin = Math.floor((i / numRays) * (freqData.length * 0.5));
          const val = freqData[bin] || 0;
          const r = radius + (val / 255) * (radius * 0.8);

          const px = centerX + Math.cos(angle) * r;
          const py = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mode]);

  // Helper for 16-segment VU meter ladder
  const renderMeterSegments = (level: number, peakHold: number) => {
    const numSegments = 16;
    const segments = [];

    for (let i = 0; i < numSegments; i++) {
      const threshold = (i + 1) / numSegments;
      const isLit = level >= threshold;
      const isPeakHold = Math.abs(peakHold - threshold) < 1 / numSegments && peakHold >= threshold;

      // Color coding: 0-10 green, 11-13 yellow, 14-16 red
      let colorClass = 'bg-emerald-500/80';
      if (i >= 13) {
        colorClass = 'bg-rose-500';
      } else if (i >= 10) {
        colorClass = 'bg-amber-400';
      }

      segments.push(
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-[1px] transition-all duration-75 ${
            isLit || isPeakHold
              ? `${colorClass} shadow-sm`
              : 'bg-zinc-800/80 opacity-40'
          }`}
        />
      );
    }

    return segments;
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 shadow-lg flex flex-col gap-3.5">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
              SPECTRUM ANALYZER & VU MONITOR
            </h3>
            <p className="text-[11px] text-zinc-400">
              60 FPS real-time audio FFT telemetry and true stereo peak meters
            </p>
          </div>
        </div>

        {/* Visualizer Mode Switch */}
        <div className="flex items-center gap-1 p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg">
          <button
            onClick={() => setMode('bars')}
            className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
              mode === 'bars'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Frequency Bars"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bars</span>
          </button>

          <button
            onClick={() => setMode('curve')}
            className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
              mode === 'curve'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Smooth Curve"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Curve</span>
          </button>

          <button
            onClick={() => setMode('oscilloscope')}
            className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
              mode === 'oscilloscope'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Time-Domain Oscilloscope"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Scope</span>
          </button>

          <button
            onClick={() => setMode('spectrum-glow')}
            className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
              mode === 'spectrum-glow'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Radial Aura"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Aura</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Visualizer */}
      <div className="h-32 sm:h-36 w-full rounded-lg overflow-hidden border border-zinc-800/90 relative bg-zinc-950">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Subtle Axis Markings on Bottom */}
        <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[9px] font-mono text-zinc-600 pointer-events-none">
          <span>32 Hz</span>
          <span>250 Hz</span>
          <span>1 kHz</span>
          <span>4 kHz</span>
          <span>16 kHz</span>
        </div>
      </div>

      {/* Dual Stereo VU Peak Meters */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 flex flex-col gap-2.5">
        {/* Left Channel */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold text-zinc-400 w-4">
            L
          </span>
          <div className="flex-1 flex items-center gap-1">
            {renderMeterSegments(vuData.leftRms, leftPeakHold)}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 w-12 text-right">
            {(vuData.leftPeak * 100).toFixed(0)}%
          </span>
        </div>

        {/* Right Channel */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold text-zinc-400 w-4">
            R
          </span>
          <div className="flex-1 flex items-center gap-1">
            {renderMeterSegments(vuData.rightRms, rightPeakHold)}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 w-12 text-right">
            {(vuData.rightPeak * 100).toFixed(0)}%
          </span>
        </div>

        {/* Clip Alert & Limiter Status Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                vuData.isClipping
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : 'text-zinc-500'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {vuData.isClipping ? 'PEAK CLIPPING DETECTED' : 'HEADROOM OK'}
            </span>
          </div>

          <div className="text-zinc-400">
            Limiter Ceiling: <span className="text-zinc-200">-1.0 dBFS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
