/**
 * PlaybackControls.tsx — 0.1g Featherweight Transport Bar
 */

import React, { useState } from 'react';
import { PlaybackMode, HandSelection } from '../types';
import { translations, Language } from '../i18n/translations';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  mode: PlaybackMode;
  hand: HandSelection;
  tempo: number;
  noteSpeed: number;
  loopStart?: number | null;
  loopEnd?: number | null;
  volume: number;
  lang: Language;
  onVolumeChange: (vol: number) => void;
  onPlayPause: () => void;
  onRewind: () => void;
  onSeek: (time: number) => void;
  onModeChange: (mode: PlaybackMode) => void;
  onHandChange: (hand: HandSelection) => void;
  onTempoChange: (tempo: number) => void;
  onNoteSpeedChange?: (speed: number) => void;
  onSetLoopA?: () => void;
  onSetLoopB?: () => void;
  onClearLoop?: () => void;
  onAutoDetectBpm?: () => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

export const PlaybackControls: React.FC<PlaybackControlsProps> = React.memo(({
  isPlaying,
  currentTime,
  duration,
  mode,
  hand,
  tempo,
  volume,
  lang,
  onVolumeChange,
  onPlayPause,
  onRewind,
  onSeek,
  onModeChange,
  onHandChange,
  onTempoChange,
}) => {
  const [prevVol, setPrevVol] = useState(0.85);
  const t = translations[lang];

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVol(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVol > 0 ? prevVol : 0.85);
    }
  };

  return (
    <div className="bg-[#060709] border-t border-[#12131a] select-none text-zinc-300 flex flex-col">
      {/* 1. Hairline Scrubber (100% width, razor-thin) */}
      <div className="w-full relative h-1.5 group cursor-pointer bg-[#0e1017]">
        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={0.05}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
        />
        <div
          className="h-full bg-indigo-500 transition-all pointer-events-none group-hover:bg-indigo-400"
          style={{ width: `${Math.min(100, (currentTime / Math.max(1, duration)) * 100)}%` }}
        />
      </div>

      {/* 2. Razor-Thin Transport Row */}
      <div className="h-9 px-3 flex items-center justify-between gap-3 text-xs">
        {/* Sol: Play/Pause, Rewind, Time */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRewind}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-xs"
            title={t.rewind}
          >
            ⏮
          </button>

          <button
            onClick={onPlayPause}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
            title={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <span className="font-mono text-[11px] text-zinc-400">
            {fmt(currentTime)} <span className="text-zinc-600">/</span> {fmt(duration)}
          </span>
        </div>

        {/* Orta: Mod Seçimi & El Seçimi */}
        <div className="flex items-center space-x-2">
          {/* Dinle / Pratik */}
          <div className="flex rounded-md bg-[#0e1017] p-0.5 border border-white/5">
            <button
              onClick={() => onModeChange('play')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                mode === 'play' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.listen}
            </button>
            <button
              onClick={() => onModeChange('practice-wait')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                mode === 'practice-wait' ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.practiceWait}
            </button>
          </div>

          {/* El Seçimi (Sol / İkisi / Sağ) */}
          <div className="hidden sm:flex rounded-md bg-[#0e1017] p-0.5 border border-white/5">
            <button
              onClick={() => onHandChange('left')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                hand === 'left' ? 'bg-sky-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              L
            </button>
            <button
              onClick={() => onHandChange('both')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                hand === 'both' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => onHandChange('right')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                hand === 'right' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              R
            </button>
          </div>
        </div>

        {/* Sağ: Ses & Tempo */}
        <div className="flex items-center space-x-2">
          {/* Ses Ayarı */}
          <div className="flex items-center space-x-1.5 bg-[#0e1017] px-2 py-0.5 rounded border border-white/5">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white text-xs transition-colors"
              title="Mute / Unmute"
            >
              {volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1 bg-[#181b26] rounded-full appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          {/* Tempo Seçici */}
          <select
            value={tempo}
            onChange={(e) => onTempoChange(parseFloat(e.target.value))}
            className="bg-[#0e1017] border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 outline-none cursor-pointer hover:bg-[#151722]"
            title={t.speed}
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
          </select>
        </div>
      </div>
    </div>
  );
});
