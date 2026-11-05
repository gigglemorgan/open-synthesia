/**
 * PlaybackControls.tsx
 * Alt Çalma, Zaman Çubuğu, Etüd Modu ve Hız Kontrolleri
 */

import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Gauge, 
  Repeat, 
  CheckCircle2, 
  Layers,
  Sliders
} from 'lucide-react';
import { PlaybackMode, HandSelection } from '../types';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  mode: PlaybackMode;
  hand: HandSelection;
  tempo: number;
  noteSpeed: number;
  loopStart: number | null;
  loopEnd: number | null;
  onPlayPause: () => void;
  onRewind: () => void;
  onSeek: (time: number) => void;
  onModeChange: (mode: PlaybackMode) => void;
  onHandChange: (hand: HandSelection) => void;
  onTempoChange: (tempo: number) => void;
  onNoteSpeedChange: (speed: number) => void;
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onClearLoop: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  mode,
  hand,
  tempo,
  noteSpeed,
  loopStart,
  loopEnd,
  onPlayPause,
  onRewind,
  onSeek,
  onModeChange,
  onHandChange,
  onTempoChange,
  onNoteSpeedChange,
  onSetLoopA,
  onSetLoopB,
  onClearLoop,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const tempoOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="bg-[#12141c] border-t border-[#232738] p-3 select-none flex flex-col space-y-2.5">
      {/* 1. Üst Sıra: Zaman Çubuğu */}
      <div className="flex items-center space-x-3 w-full">
        <span className="text-xs font-mono text-gray-400 w-10 text-right">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#252a3b] rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
          />

          {/* Loop A & B Visual Markers on Timeline */}
          {loopStart !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-400 rounded-sm pointer-events-none"
              style={{ left: `${(loopStart / duration) * 100}%` }}
              title={`Loop A: ${formatTime(loopStart)}`}
            />
          )}
          {loopEnd !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-4 bg-amber-400 rounded-sm pointer-events-none"
              style={{ left: `${(loopEnd / duration) * 100}%` }}
              title={`Loop B: ${formatTime(loopEnd)}`}
            />
          )}
        </div>

        <span className="text-xs font-mono text-gray-400 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* 2. Alt Sıra: Kontrol Düğmeleri */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sol Taraf: Oynat, Durdur, Başa Sar */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRewind}
            className="p-2 rounded-lg bg-[#1a1d28] hover:bg-[#252a3b] text-gray-300 hover:text-white transition-colors"
            title="Başa Sar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            title={isPlaying ? "Durdur" : "Başlat"}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Mod Seçimi (Dinle / Etüd Bekleme / Ritim) */}
          <div className="flex items-center rounded-lg bg-[#181b26] p-0.5 border border-[#2a3045]">
            <button
              onClick={() => onModeChange('play')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'play'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🎵 Dinle
            </button>
            <button
              onClick={() => onModeChange('practice-wait')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1 ${
                mode === 'practice-wait'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Tuşa basana kadar bekler (Etüd Öğrenme)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Etüd (Bekleme)</span>
            </button>
            <button
              onClick={() => onModeChange('practice-rhythm')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                mode === 'practice-rhythm'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Ritim ve zamanlama antrenmanı"
            >
              🎯 Ritim
            </button>
          </div>
        </div>

        {/* Orta: El Seçimi (Sol El / İki El / Sağ El) */}
        <div className="flex items-center rounded-lg bg-[#181b26] p-0.5 border border-[#2a3045]">
          <span className="text-[11px] text-gray-500 px-2 font-medium flex items-center">
            <Layers className="w-3 h-3 mr-1" /> El:
          </span>
          <button
            onClick={() => onHandChange('left')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              hand === 'left' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sol El
          </button>
          <button
            onClick={() => onHandChange('both')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              hand === 'both' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            İki El
          </button>
          <button
            onClick={() => onHandChange('right')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              hand === 'right' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sağ El
          </button>
        </div>

        {/* Sağ Taraf: Hız & A-B Loop & Şelale Hızı */}
        <div className="flex items-center space-x-2">
          {/* A-B Loop */}
          <div className="flex items-center space-x-1 bg-[#181b26] p-1 rounded-lg border border-[#2a3045]">
            <button
              onClick={onSetLoopA}
              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                loopStart !== null ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Döngü Başlangıcı [A] Noktası Belirle"
            >
              [A]
            </button>
            <button
              onClick={onSetLoopB}
              className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
                loopEnd !== null ? 'bg-amber-500/20 text-amber-300' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Döngü Bitişi [B] Noktası Belirle"
            >
              [B]
            </button>
            {(loopStart !== null || loopEnd !== null) && (
              <button
                onClick={onClearLoop}
                className="px-1.5 py-1 rounded text-xs text-rose-400 hover:text-rose-300"
                title="Döngüyü Sıfırla"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tempo Multiplier */}
          <div className="flex items-center space-x-1 bg-[#181b26] p-1 rounded-lg border border-[#2a3045]">
            <Gauge className="w-3.5 h-3.5 text-gray-400 ml-1" />
            <select
              value={tempo}
              onChange={(e) => onTempoChange(parseFloat(e.target.value))}
              className="bg-transparent text-xs text-gray-200 border-none outline-none cursor-pointer pr-1"
            >
              {tempoOptions.map(t => (
                <option key={t} value={t} className="bg-[#1e2230] text-white">
                  {t}x Hız
                </option>
              ))}
            </select>
          </div>

          {/* Falling Speed Slider */}
          <div className="hidden xl:flex items-center space-x-2 bg-[#181b26] px-2.5 py-1 rounded-lg border border-[#2a3045]">
            <Sliders className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-400">Görüş:</span>
            <input
              type="range"
              min={1.5}
              max={4.5}
              step={0.5}
              value={noteSpeed}
              onChange={(e) => onNoteSpeedChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#252a3b] rounded-lg cursor-pointer accent-indigo-400"
              title={`Şelale Hızı: ${noteSpeed}s`}
            />
            <span className="text-[11px] text-gray-400">{noteSpeed}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
