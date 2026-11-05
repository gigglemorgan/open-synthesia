/**
 * PlaybackControls.tsx
 * Ultra-Sade & Hafif Kontrol Konsolu (Minimalist & Multi-Language)
 */

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX
} from 'lucide-react';
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
  loopStart: number | null;
  loopEnd: number | null;
  volume: number;
  lang: Language;
  onVolumeChange: (vol: number) => void;
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
  onAutoDetectBpm: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  bpm,
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
  onAutoDetectBpm,
}) => {
  const [prevVolume, setPrevVolume] = useState<number>(0.85);
  const t = translations[lang];

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume > 0 ? prevVolume : 0.85);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentMeasure = Math.floor((currentTime * (bpm / 60)) / 4) + 1;
  const currentBeat = (Math.floor(currentTime * (bpm / 60)) % 4) + 1;

  return (
    <div className="bg-[#07080b] border-t border-[#14161f] px-3 py-2 select-none flex flex-col space-y-1.5 text-zinc-300">
      {/* 1. İnce Zaman Çizgisi */}
      <div className="flex items-center space-x-2.5 w-full">
        <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={0.05}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1 bg-[#151722] rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
        />

        <span className="text-[10px] font-mono text-zinc-500 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* 2. Sade Kontrol Düğmeleri */}
      <div className="flex items-center justify-between gap-2">
        {/* Sol: Play / Pause & Rewind */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onRewind}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#12141c] transition-colors"
            title={t.rewind}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPlayPause}
            className={`w-7 h-7 rounded-md flex items-center justify-center font-bold transition-all ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
            title={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>

          {/* Minimal Ölçü & BPM Bilgisi */}
          <div className="flex items-center space-x-2 px-2 py-0.5 rounded bg-[#0d0e14] border border-[#171924] font-mono text-[10px] text-zinc-400">
            <span>{currentMeasure}.{currentBeat}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-bold">{Math.round(bpm * tempo)} BPM</span>
            <button
              onClick={onAutoDetectBpm}
              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
              title="Auto Detect BPM"
            >
              {t.autoBpm}
            </button>
          </div>
        </div>

        {/* Orta: Modlar & El */}
        <div className="flex items-center space-x-1.5 text-xs">
          {/* Mod Butonları */}
          <div className="flex items-center rounded bg-[#0d0e14] p-0.5 border border-[#171924]">
            <button
              onClick={() => onModeChange('play')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                mode === 'play' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.listen}
            </button>
            <button
              onClick={() => onModeChange('practice-wait')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                mode === 'practice-wait' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.practiceWait}
            </button>
            <button
              onClick={() => onModeChange('practice-rhythm')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                mode === 'practice-rhythm' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.practiceRhythm}
            </button>
          </div>

          {/* El Butonları */}
          <div className="hidden sm:flex items-center rounded bg-[#0d0e14] p-0.5 border border-[#171924]">
            <button
              onClick={() => onHandChange('left')}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                hand === 'left' ? 'bg-sky-600 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.handLeft}
            </button>
            <button
              onClick={() => onHandChange('both')}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                hand === 'both' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.handBoth}
            </button>
            <button
              onClick={() => onHandChange('right')}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                hand === 'right' ? 'bg-emerald-600 text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.handRight}
            </button>
          </div>
        </div>

        {/* Sağ: Ses ve Hız */}
        <div className="flex items-center space-x-2">
          {/* Master Volume */}
          <div className="flex items-center space-x-1.5 bg-[#0d0e14] px-2 py-0.5 rounded border border-[#171924]">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
              {volume === 0 ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1 bg-[#1a1c28] rounded-full appearance-none cursor-pointer accent-indigo-400"
              title={`${t.masterVol}: %${Math.round(volume * 100)}`}
            />
          </div>

          {/* Hız */}
          <select
            value={tempo}
            onChange={(e) => onTempoChange(parseFloat(e.target.value))}
            className="bg-[#0d0e14] border border-[#171924] rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 outline-none cursor-pointer"
          >
            {[0.5, 0.75, 1.0, 1.25, 1.5].map(v => (
              <option key={v} value={v} className="bg-[#10121a] text-white">
                {v}x
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
