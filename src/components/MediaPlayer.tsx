import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCw,
  Upload,
  Mic,
  Music,
  FileAudio,
  Radio,
  Video,
  Volume2,
  Gauge,
} from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

interface MediaPlayerProps {
  onAudioStart: () => void;
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}

interface DemoTrackItem {
  id: string;
  name: string;
  category: string;
  durationText: string;
  desc: string;
}

const DEMO_TRACKS: DemoTrackItem[] = [
  {
    id: 'muffled',
    name: 'Muffled Speaker Test',
    category: 'Benchmark',
    durationText: '0:10 (Loop)',
    desc: 'Intentionally muddy, quiet audio with low hum. Demonstrates dramatic clarity transformation.',
  },
  {
    id: 'podcast',
    name: 'Podcast & Dialogue Scene',
    category: 'Speech',
    durationText: '0:12 (Loop)',
    desc: 'Vocal formant speech simulation over acoustic background bed. Tests dialogue intelligibility.',
  },
  {
    id: 'beats',
    name: 'Electronic Beats & Sub-Bass',
    category: 'Music',
    durationText: '0:08 (Loop)',
    desc: 'Punchy 808 kick, snap snare, and synth bassline. Tests bass booster and anti-clip limiter.',
  },
  {
    id: 'acoustic',
    name: 'Acoustic Guitar & Piano',
    category: 'Music',
    durationText: '0:10 (Loop)',
    desc: 'Natural string plucks, harmonic overtone decay, and stereo soundstage spread.',
  },
  {
    id: 'sweep',
    name: '20Hz - 20kHz Frequency Sweep',
    category: 'Testing',
    durationText: '0:06 (Loop)',
    desc: 'Pure continuous sine wave sweep across the entire audible human frequency spectrum.',
  },
];

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  onAudioStart,
  masterVolume,
  onVolumeChange,
  playbackSpeed,
  onSpeedChange,
}) => {
  const [sourceType, setSourceType] = useState<'demo' | 'file' | 'mic'>('demo');
  const [selectedDemoId, setSelectedDemoId] = useState<string>('muffled');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackPos, setPlaybackPos] = useState<{ current: number; total: number }>({
    current: 0,
    total: 10,
  });

  // Uploaded media state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [isVideoFile, setIsVideoFile] = useState<boolean>(false);

  // Mic state
  const [isMicActive, setIsMicActive] = useState<boolean>(false);

  // Media element refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync playback state from audioEngine (so buttons don't get stuck on Pause when track ends)
  useEffect(() => {
    audioEngine.onPlaybackStateChange = (playing) => {
      setIsPlaying(playing);
    };
    return () => {
      audioEngine.onPlaybackStateChange = undefined;
    };
  }, []);

  // Position update interval
  useEffect(() => {
    let animId: number;

    const tick = () => {
      if (sourceType === 'demo') {
        const pos = audioEngine.getBufferPlaybackPosition();
        setPlaybackPos(pos);
      } else if (sourceType === 'file') {
        const el = isVideoFile ? videoElementRef.current : audioElementRef.current;
        if (el) {
          setPlaybackPos({
            current: el.currentTime || 0,
            total: el.duration || 1,
          });
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [sourceType, isVideoFile]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (uploadedMediaUrl) {
        URL.revokeObjectURL(uploadedMediaUrl);
      }
    };
  }, [uploadedMediaUrl]);

  // Handle Play/Pause for Demo
  const togglePlayDemo = async () => {
    await audioEngine.initContext();
    onAudioStart();

    if (isPlaying) {
      audioEngine.pauseBuffer();
      setIsPlaying(false);
    } else {
      audioEngine.isBufferLooping = isLooping;
      audioEngine.resumeBuffer(selectedDemoId);
      setIsPlaying(true);
    }
  };

  // Switch demo track
  const handleSelectDemo = async (demoId: string) => {
    setSelectedDemoId(demoId);
    if (isPlaying) {
      await audioEngine.initContext();
      audioEngine.playBuffer(demoId, 0);
    }
  };

  // Handle Uploaded File Play/Pause
  const togglePlayUploaded = async () => {
    await audioEngine.initContext();
    onAudioStart();

    const mediaEl = isVideoFile ? videoElementRef.current : audioElementRef.current;
    if (!mediaEl) return;

    audioEngine.attachMediaElement(mediaEl);

    if (mediaEl.paused) {
      try {
        await mediaEl.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error:', err);
      }
    } else {
      mediaEl.pause();
      setIsPlaying(false);
    }
  };

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    loadCustomFile(files[0]);
  };

  const loadCustomFile = (file: File) => {
    if (uploadedMediaUrl) {
      URL.revokeObjectURL(uploadedMediaUrl);
    }

    const isVid = file.type.startsWith('video/');
    setIsVideoFile(isVid);
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedMediaUrl(url);
    setIsPlaying(false);
    setSourceType('file');

    audioEngine.stopBuffer();
  };

  // Handle Microphone
  const toggleMicrophone = async () => {
    if (isMicActive) {
      audioEngine.detachMicrophone();
      setIsMicActive(false);
    } else {
      try {
        await audioEngine.attachMicrophone();
        setIsMicActive(true);
        onAudioStart();
      } catch (err) {
        console.error('Microphone error:', err);
        alert('Could not access microphone. Please allow microphone permissions in your browser.');
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (newFraction: number) => {
    if (sourceType === 'demo') {
      const pos = audioEngine.getBufferPlaybackPosition();
      const targetSec = newFraction * (pos.total || 10);
      if (isPlaying) {
        audioEngine.playBuffer(selectedDemoId, targetSec);
      }
    } else if (sourceType === 'file') {
      const el = isVideoFile ? videoElementRef.current : audioElementRef.current;
      if (el && el.duration) {
        el.currentTime = newFraction * el.duration;
      }
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 lg:p-5 shadow-lg flex flex-col gap-4">
      {/* Tab Header for Source Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 rounded-lg border border-zinc-800">
          <button
            onClick={() => {
              setSourceType('demo');
              if (isMicActive) toggleMicrophone();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              sourceType === 'demo'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Built-in Samples</span>
          </button>

          <button
            onClick={() => {
              setSourceType('file');
              if (isMicActive) toggleMicrophone();
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              sourceType === 'file'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Media</span>
          </button>

          <button
            onClick={() => {
              setSourceType('mic');
              audioEngine.stopBuffer();
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              sourceType === 'mic'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Live Mic Test</span>
          </button>
        </div>

        {/* Playback Speed & Master Output Volume */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <Gauge className="w-3.5 h-3.5 text-zinc-400 ml-1" />
            {SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Master Volume Fader */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">
              {Math.round(masterVolume * 100)}%
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 sm:w-24 accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              title="Master Listening Volume"
            />
          </div>
        </div>
      </div>

      {/* Body: Source Type 1 - Built-in Samples */}
      {sourceType === 'demo' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {DEMO_TRACKS.map((track) => {
              const isSelected = selectedDemoId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => handleSelectDemo(track.id)}
                  className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 text-zinc-100 ring-1 ring-amber-500/30'
                      : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                        {track.category}
                      </span>
                      {isSelected && isPlaying && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-zinc-200 line-clamp-1">
                      {track.name}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-2 line-clamp-2 leading-tight">
                    {track.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Body: Source Type 2 - Upload Media File */}
      {sourceType === 'file' && (
        <div className="flex flex-col gap-3">
          {!uploadedMediaUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  loadCustomFile(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-xl p-6 text-center cursor-pointer bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <div className="p-3 rounded-full bg-cyan-950/40 border border-cyan-800/50 text-cyan-400">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-zinc-200">
                Drop your audio or video file here, or click to browse
              </div>
              <p className="text-xs text-zinc-400">
                Supports MP3, WAV, AAC, FLAC, M4A, OGG, and MP4 / WebM video files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3 bg-zinc-950/50 border border-zinc-800 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-zinc-800 rounded-lg text-cyan-400">
                    {isVideoFile ? <Video className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-200 font-mono">
                      {uploadedFile?.name}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {isVideoFile ? 'Synchronized Video Playback' : 'Audio Track'} ·{' '}
                      {((uploadedFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUploadedMediaUrl(null);
                    setUploadedFile(null);
                    setIsPlaying(false);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
                >
                  Change File
                </button>
              </div>

              {/* Synchronized Video Preview */}
              {isVideoFile && (
                <div className="relative rounded-lg overflow-hidden bg-black max-h-56 flex items-center justify-center border border-zinc-800">
                  <video
                    ref={videoElementRef}
                    src={uploadedMediaUrl}
                    loop={isLooping}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="max-h-56 w-auto object-contain"
                  />
                </div>
              )}

              {/* Hidden audio element if audio */}
              {!isVideoFile && (
                <audio
                  ref={audioElementRef}
                  src={uploadedMediaUrl}
                  loop={isLooping}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Body: Source Type 3 - Live Microphone Test */}
      {sourceType === 'mic' && (
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-lg border ${
                isMicActive
                  ? 'bg-rose-950/50 border-rose-600 text-rose-400 animate-pulse'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200 font-mono flex items-center gap-2">
                <span>Microphone Live Feed</span>
                {isMicActive && (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Test real-time speech enhancement, noise filtering, and volume boosting through your microphone.
              </p>
              <p className="text-[11px] text-amber-400/90 mt-1">
                Tip: Please use headphones while speaking to avoid acoustic feedback loops with your speakers.
              </p>
            </div>
          </div>

          <button
            onClick={toggleMicrophone}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all shrink-0 ${
              isMicActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            {isMicActive ? 'Stop Microphone' : 'Activate Microphone'}
          </button>
        </div>
      )}

      {/* Shared Transport Bar */}
      {sourceType !== 'mic' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-zinc-800/60">
          {/* Main Play / Pause and Loop Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={sourceType === 'demo' ? togglePlayDemo : togglePlayUploaded}
              className={`p-3 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                  : 'bg-zinc-100 hover:bg-white text-zinc-900'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                const nextLoop = !isLooping;
                setIsLooping(nextLoop);
                audioEngine.isBufferLooping = nextLoop;
                if (audioElementRef.current) audioElementRef.current.loop = nextLoop;
                if (videoElementRef.current) videoElementRef.current.loop = nextLoop;
              }}
              className={`p-2.5 rounded-lg border transition-colors ${
                isLooping
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
              title={isLooping ? 'Loop enabled' : 'Loop disabled'}
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Current Status Label */}
            <div className="flex flex-col">
              <span className="text-xs font-mono font-semibold text-zinc-200">
                {sourceType === 'demo'
                  ? DEMO_TRACKS.find((t) => t.id === selectedDemoId)?.name
                  : uploadedFile?.name || 'No file selected'}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {formatTime(playbackPos.current)} / {formatTime(playbackPos.total)}
              </span>
            </div>
          </div>

          {/* Interactive Timeline Scrubber with simulated audio wave tick markers */}
          <div className="flex-1 w-full max-w-xl flex items-center gap-2 relative">
            <div className="w-full relative flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={playbackPos.total > 0 ? playbackPos.current / playbackPos.total : 0}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2.5 bg-zinc-950 rounded-lg border border-zinc-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
