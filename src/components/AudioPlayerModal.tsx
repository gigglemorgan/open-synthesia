/**
 * AudioPlayerModal.tsx
 * Stüdyo Ses Monitörü & MP3 Oynatıcı
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Headphones, 
  Upload,
  Repeat,
  Radio
} from 'lucide-react';

interface AudioPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string | null;
  audioTitle: string;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({
  isOpen,
  onClose,
  audioUrl,
  audioTitle,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(audioUrl);
  const [title, setTitle] = useState(audioTitle || 'Ses Kaydı');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl) {
      setCurrentUrl(audioUrl);
      setTitle(audioTitle || 'Dönüştürülen Eser');
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl, audioTitle]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!audioRef.current || !currentUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCurrentUrl(url);
      setTitle(file.name);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111218] border border-[#232738] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#202436] flex items-center justify-between bg-[#0d0e14]">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-mono font-bold text-zinc-200 tracking-wider uppercase">
              Ses Monitörü & Çalar
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#1a1d2c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Parça Başlığı */}
          <div className="text-center space-y-2">
            <div className="p-3 bg-[#0a0b10] border border-[#1d2030] rounded-lg">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">{title}</h3>
              <p className="text-[11px] font-mono text-emerald-400 mt-0.5">44.1 kHz • MP3 192kbps</p>
            </div>

            {/* Spektrum Çubukları */}
            <div className="flex items-center justify-center space-x-1 h-7 pt-1">
              {[35, 65, 25, 80, 50, 95, 40, 75, 45, 90, 30, 70, 45, 80, 55, 25].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-sm bg-emerald-400 transition-all duration-150 ${
                    isPlaying ? 'opacity-90' : 'opacity-20'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, (h * (Math.sin(currentTime * 6 + i) + 1.2)) / 2.2)}%` : '15%',
                  }}
                />
              ))}
            </div>
          </div>

          {currentUrl && (
            <audio
              ref={audioRef}
              src={currentUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              loop={isLooping}
            />
          )}

          {/* Timeline */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={Math.max(1, duration)}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              disabled={!currentUrl}
              className="w-full h-1 bg-[#202434] rounded-full appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[11px] font-mono text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Oynatma Kontrolleri */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2 rounded-md transition-colors ${
                isLooping ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400 hover:text-white hover:bg-[#1a1d2c]'
              }`}
              title="Tekrarla"
            >
              <Repeat className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSeek(0)}
              disabled={!currentUrl}
              className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1d2c] transition-colors disabled:opacity-30"
              title="Başa Dön"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!currentUrl}
              className="w-11 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#1a1d2c] transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (audioRef.current) audioRef.current.playbackRate = rate;
              }}
              className="bg-[#181a24] text-[11px] font-mono text-zinc-200 border border-[#2b3046] rounded px-1.5 py-1 outline-none cursor-pointer"
            >
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          {/* Farklı Dosya Yükle */}
          <div className="pt-2 border-t border-[#1e2232] flex items-center justify-center">
            <input
              type="file"
              accept="audio/*"
              id="audio-custom-player-upload"
              className="hidden"
              onChange={handleCustomUpload}
            />
            <label
              htmlFor="audio-custom-player-upload"
              className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Harici bir ses dosyası seçip dinle</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
