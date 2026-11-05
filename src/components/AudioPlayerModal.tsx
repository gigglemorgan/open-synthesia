/**
 * AudioPlayerModal.tsx
 * Dahili Müzik ve MP3 Dinleme Çaları (Görsel Dalga Formu ile)
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
  Repeat
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

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
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
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#141722] border border-[#262c42] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262c42] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dahili Müzik Çalar</h2>
              <p className="text-xs text-gray-400">MP3 / WAV dinleme ve prova alanı</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e2334] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Parça Başlığı ve Dalga Görseli */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="text-3xl">🎧</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white truncate px-4">{title}</h3>
              <p className="text-xs text-emerald-400 font-medium mt-0.5">Gerçek Akustik Piyano Kaydı</p>
            </div>

            {/* Simulated Animated Visualizer Bars */}
            <div className="flex items-center justify-center space-x-1 h-8 pt-2">
              {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 35, 75, 50, 85, 65, 30].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full bg-emerald-400 transition-all duration-150 ${
                    isPlaying ? 'opacity-90' : 'opacity-25'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, (h * (Math.sin(currentTime * 5 + i) + 1.2)) / 2.2)}%` : '15%',
                  }}
                />
              ))}
            </div>
          </div>

          {currentUrl ? (
            <audio
              ref={audioRef}
              src={currentUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              loop={isLooping}
            />
          ) : (
            <div className="text-center p-4 bg-[#1b2030] rounded-xl text-xs text-gray-400">
              Henüz ses dosyası yüklenmedi.
            </div>
          )}

          {/* Scrub Bar */}
          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={Math.max(1, duration)}
              step={0.1}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              disabled={!currentUrl}
              className="w-full h-1.5 bg-[#252a3b] rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
            />
            <div className="flex justify-between text-xs font-mono text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Oynatma Kontrolleri */}
          <div className="flex items-center justify-center space-x-5">
            {/* Loop Toggle */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2.5 rounded-xl transition-colors ${
                isLooping ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-[#1f2434]'
              }`}
              title="Tekrarla (Loop)"
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Rewind */}
            <button
              onClick={() => handleSeek(0)}
              disabled={!currentUrl}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#1f2434] transition-colors disabled:opacity-30"
              title="Başa Dön"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              disabled={!currentUrl}
              className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-40"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            {/* Mute/Volume */}
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#1f2434] transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Speed Selector */}
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (audioRef.current) audioRef.current.playbackRate = rate;
              }}
              className="bg-[#1b2030] text-xs text-gray-200 border border-[#2b334d] rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </div>

          {/* Farklı Bir Ses Yükle */}
          <div className="pt-2 border-t border-[#23283b] flex items-center justify-center">
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
              <span>Farklı bir MP3 veya Ses dosyası dinle</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
