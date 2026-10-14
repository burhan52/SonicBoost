import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Sliders,
  Bookmark,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  Download,
  Upload,
} from 'lucide-react';
import { EQ_FREQUENCIES, EQ_LABELS, DEFAULT_PRESETS } from '../audio/presets';
import { EqPreset } from '../types/audio';

interface EqualizerRackProps {
  gains: number[];
  onGainChange: (index: number, val: number) => void;
  onApplyPreset: (preset: EqPreset) => void;
  activePresetId: string | null;
}

export const EqualizerRack: React.FC<EqualizerRackProps> = ({
  gains,
  onGainChange,
  onApplyPreset,
  activePresetId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dragging state on canvas
  const [isDraggingCurve, setIsDraggingCurve] = useState(false);
  const [activeDragBand, setActiveDragBand] = useState<number | null>(null);
  const [hoveredBand, setHoveredBand] = useState<number | null>(null);

  // Custom User Presets in LocalStorage
  const [customPresets, setCustomPresets] = useState<EqPreset[]>(() => {
    try {
      const saved = localStorage.getItem('auraboost_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const saveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: EqPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      category: 'Utility',
      description: 'Custom user equalizer configuration',
      gains: [...gains],
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    try {
      localStorage.setItem('auraboost_custom_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewPresetName('');
    setShowSaveModal(false);
    onApplyPreset(newPreset);
  };

  const deleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem('auraboost_custom_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleFlatten = () => {
    const flatPreset: EqPreset = {
      id: 'flat-reference',
      name: 'Flat Reference',
      category: 'Utility',
      description: 'Flat 0dB response',
      gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    onApplyPreset(flatPreset);
  };

  // Export Presets to JSON
  const handleExportPresets = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customPresets, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `auraboost-custom-presets-${Date.now()}.json`);
    dlAnchor.click();
  };

  // Import Presets from JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const merged = [...customPresets, ...imported];
          setCustomPresets(merged);
          localStorage.setItem('auraboost_custom_presets', JSON.stringify(merged));
          if (imported.length > 0) onApplyPreset(imported[0]);
        }
      } catch (err) {
        console.error('Failed to import presets:', err);
        alert('Invalid preset JSON file.');
      }
    };
    reader.readAsText(files[0]);
  };

  // Map frequency to Canvas X coordinate
  const getBandX = useCallback((freq: number, width: number) => {
    const minLog = Math.log10(20);
    const maxLog = Math.log10(20000);
    const logF = Math.log10(freq);
    const ratio = (logF - minLog) / (maxLog - minLog);
    return 35 + ratio * (width - 45);
  }, []);

  // Map gain dB to Canvas Y coordinate
  const getGainY = useCallback((gainDb: number, height: number) => {
    const clamped = Math.max(-12, Math.min(12, gainDb));
    return height * 0.5 - (clamped / 12) * (0.4 * height);
  }, []);

  // Map Canvas Y coordinate back to gain dB
  const getYToGain = useCallback((y: number, height: number) => {
    const normalized = (height * 0.5 - y) / (0.4 * height);
    const db = normalized * 12;
    return Math.max(-12, Math.min(12, Math.round(db * 2) / 2));
  }, []);

  // Mouse & Touch interaction on EQ Curve Canvas
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest frequency band
    let closestIdx = 0;
    let minDistance = Infinity;

    EQ_FREQUENCIES.forEach((freq, idx) => {
      const bandX = getBandX(freq, rect.width);
      const dist = Math.abs(bandX - x);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    const newGain = getYToGain(y, rect.height);
    onGainChange(closestIdx, newGain);
    setActiveDragBand(closestIdx);
    setIsDraggingCurve(true);
    canvas.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingCurve && activeDragBand !== null) {
      const newGain = getYToGain(y, rect.height);
      onGainChange(activeDragBand, newGain);
    } else {
      // Update hover state
      let closestIdx = 0;
      let minDistance = Infinity;

      EQ_FREQUENCIES.forEach((freq, idx) => {
        const bandX = getBandX(freq, rect.width);
        const dist = Math.abs(bandX - x);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      if (minDistance < 25) {
        setHoveredBand(closestIdx);
      } else {
        setHoveredBand(null);
      }
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDraggingCurve(false);
    setActiveDragBand(null);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Draw real-time EQ Curve on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines (-12dB, -6dB, 0dB, +6dB, +12dB)
    const dbLines = [
      { db: 12, y: 0.1 * height, label: '+12dB' },
      { db: 6, y: 0.3 * height, label: '+6dB' },
      { db: 0, y: 0.5 * height, label: '0dB', zero: true },
      { db: -6, y: 0.7 * height, label: '-6dB' },
      { db: -12, y: 0.9 * height, label: '-12dB' },
    ];

    ctx.font = '9px monospace';
    ctx.textAlign = 'right';

    dbLines.forEach((line) => {
      ctx.beginPath();
      ctx.strokeStyle = line.zero ? 'rgba(113, 113, 122, 0.4)' : 'rgba(39, 39, 42, 0.6)';
      ctx.lineWidth = line.zero ? 1.2 : 0.8;
      ctx.setLineDash(line.zero ? [] : [3, 3]);
      ctx.moveTo(35, line.y);
      ctx.lineTo(width - 10, line.y);
      ctx.stroke();

      ctx.fillStyle = line.zero ? '#a1a1aa' : '#52525b';
      ctx.fillText(line.label, 30, line.y + 3);
    });
    ctx.setLineDash([]);

    // Compute Spline Curve from the 10 Bands
    const points = EQ_FREQUENCIES.map((freq, idx) => ({
      x: getBandX(freq, width),
      y: getGainY(gains[idx] || 0, height),
    }));

    const allPoints = [
      { x: getBandX(20, width), y: points[0].y },
      ...points,
      { x: getBandX(20000, width), y: points[points.length - 1].y },
    ];

    // Smooth Bezier path
    ctx.beginPath();
    ctx.moveTo(allPoints[0].x, allPoints[0].y);

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p0 = allPoints[i === 0 ? 0 : i - 1];
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const p3 = allPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    // Path fill with gradient
    ctx.save();
    const fillPath = new Path2D();
    fillPath.moveTo(allPoints[0].x, height * 0.5);
    fillPath.lineTo(allPoints[0].x, allPoints[0].y);

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p0 = allPoints[i === 0 ? 0 : i - 1];
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const p3 = allPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      fillPath.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    fillPath.lineTo(allPoints[allPoints.length - 1].x, height * 0.5);
    fillPath.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fill(fillPath);
    ctx.restore();

    // Stroke the response curve
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw glowing circles at each band anchor
    points.forEach((pt, idx) => {
      const g = gains[idx] || 0;
      const isSelected = activeDragBand === idx || hoveredBand === idx;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#38bdf8' : g !== 0 ? '#06b6d4' : '#71717a';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffffff' : '#09090b';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // If active drag, show floating tooltip
      if (isSelected) {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(pt.x - 22, pt.y - 24, 44, 16);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(pt.x - 22, pt.y - 24, 44, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${g > 0 ? '+' : ''}${g}dB`, pt.x, pt.y - 13);
      }
    });
  }, [gains, activeDragBand, hoveredBand, getBandX, getGainY]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 shadow-lg flex flex-col gap-4">
      {/* Header with Title and Presets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-100 uppercase">
              10-BAND PRECISION EQUALIZER
            </h3>
            <p className="text-[11px] text-zinc-400">
              Interactive draggable parametric curve with ±12 dB high-order biquad filters
            </p>
          </div>
        </div>

        {/* Quick Tools: Flatten, Export, Import, Save Preset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFlatten}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset all bands to 0 dB flat"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Flatten</span>
          </button>

          {customPresets.length > 0 && (
            <button
              onClick={handleExportPresets}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Export custom presets as JSON"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Import presets from JSON"
          >
            <Upload className="w-3 h-3" />
            <span>Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-cyan-400 hover:bg-zinc-800 transition-colors"
            title="Save current EQ curve as a custom preset"
          >
            <Plus className="w-3 h-3" />
            <span>Save Preset</span>
          </button>
        </div>
      </div>

      {/* Preset Pills / Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
          <Bookmark className="w-3 h-3" />
          Presets:
        </span>
        {DEFAULT_PRESETS.map((p) => {
          const isActive = activePresetId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p)}
              className={`px-2.5 py-1 rounded text-xs font-mono shrink-0 transition-all border cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold shadow-sm'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
              title={p.description}
            >
              {p.name}
            </button>
          );
        })}

        {/* Custom Presets */}
        {customPresets.map((p) => {
          const isActive = activePresetId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onApplyPreset(p)}
              className={`px-2.5 py-1 rounded text-xs font-mono shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                  : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{p.name}</span>
              <button
                onClick={(e) => deleteCustomPreset(p.id, e)}
                className="text-zinc-500 hover:text-rose-400 transition-colors p-0.5"
                title="Delete this custom preset"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive Real-time Frequency Response Canvas (Click & Drag enabled!) */}
      <div className="h-28 sm:h-32 w-full rounded-lg overflow-hidden border border-zinc-800/90 relative bg-zinc-950 cursor-crosshair">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          className="w-full h-full block touch-none"
        />
        <div className="absolute top-1.5 right-2 text-[9px] font-mono text-zinc-500 pointer-events-none">
          Click or drag on curve to shape frequencies
        </div>
      </div>

      {/* 10 Precision Vertical Faders */}
      <div className="grid grid-cols-10 gap-1 sm:gap-2 pt-2">
        {EQ_FREQUENCIES.map((freq, idx) => {
          const gain = gains[idx] || 0;
          const label = EQ_LABELS[idx];

          return (
            <div
              key={freq}
              className={`flex flex-col items-center justify-between bg-zinc-950/50 border rounded-lg py-2.5 px-1 group transition-colors ${
                activeDragBand === idx || hoveredBand === idx
                  ? 'border-cyan-500/60 ring-1 ring-cyan-500/30'
                  : 'border-zinc-800/80'
              }`}
              onDoubleClick={() => onGainChange(idx, 0)}
              title={`Double-click to reset ${label} to 0 dB`}
            >
              {/* dB Readout */}
              <span
                className={`text-[10px] font-mono leading-none font-semibold ${
                  gain > 0
                    ? 'text-cyan-400'
                    : gain < 0
                    ? 'text-amber-400'
                    : 'text-zinc-500'
                }`}
              >
                {gain > 0 ? `+${gain.toFixed(1)}` : gain < 0 ? gain.toFixed(1) : '0'}
              </span>

              {/* Vertical Fader Slider */}
              <div className="h-28 sm:h-32 flex items-center justify-center my-1 relative">
                {/* Center 0dB hairline marker */}
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-700/60 pointer-events-none" />

                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gain}
                  onChange={(e) => onGainChange(idx, parseFloat(e.target.value))}
                  className="h-24 sm:h-28 appearance-none cursor-pointer bg-transparent accent-cyan-400 [writing-mode:vertical-lr] [direction:rtl]"
                />
              </div>

              {/* Frequency Label */}
              <span className="text-[10px] font-mono text-zinc-400 mt-1 truncate max-w-full">
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Save Preset Dialog */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <h4 className="text-sm font-semibold font-mono text-zinc-100">
              Save Custom EQ Preset
            </h4>
            <input
              type="text"
              placeholder="e.g. My Studio Monitors"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomPreset}
                disabled={!newPresetName.trim()}
                className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded font-mono font-medium flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
