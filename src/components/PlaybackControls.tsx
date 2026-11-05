/**
 * PlaybackControls.tsx
 * DAW Tipi Profesyonel Oynatma, Hacim (Volume), Otomatik BPM & Etüd Konsolu
 */

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Activity, 
  Repeat, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { PlaybackMode, HandSelection } from '../types';

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
  noteSpeed,
  loopStart,
  loopEnd,
  volume,
  onVolumeChange,
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
  onAutoDetectBpm,
}) => {
  const [prevVolume, setPrevVolume] = useState<number>(0.8);

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume > 0 ? prevVolume : 0.8);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Measure / Beat estimate
  const currentMeasure = Math.floor((currentTime * (bpm / 60)) / 4) + 1;
  const currentBeat = (Math.floor(currentTime * (bpm / 60)) % 4) + 1;

  const tempoOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="bg-[#101117] border-t border-[#1f2230] p-2.5 select-none flex flex-col space-y-2">
      {/* 1. Zaman Çizelgesi (Timeline Scrub) */}
      <div className="flex items-center space-x-3 w-full px-1">
        <span className="text-[11px] font-mono text-zinc-400 w-12 text-right">
          {formatTime(currentTime)}
        </span>

        <div className="relative flex-1 flex items-center group">
          <input
            type="range"
            min={0}
            max={Math.max(1, duration)}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#202434] group-hover:h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 transition-all"
          />

          {loopStart !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-amber-400 rounded-sm pointer-events-none shadow-[0_0_6px_#f59e0b]"
              style={{ left: `${(loopStart / duration) * 100}%` }}
              title={`Loop Start: ${formatTime(loopStart)}`}
            />
          )}
          {loopEnd !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-amber-400 rounded-sm pointer-events-none shadow-[0_0_6px_#f59e0b]"
              style={{ left: `${(loopEnd / duration) * 100}%` }}
              title={`Loop End: ${formatTime(loopEnd)}`}
            />
          )}
        </div>

        <span className="text-[11px] font-mono text-zinc-400 w-12">
          {formatTime(duration)}
        </span>
      </div>

      {/* 2. Konsol Paneli */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Sol Grup: Transport Tuşları & LCD Sayaç */}
        <div className="flex items-center space-x-2.5">
          {/* Rewind */}
          <button
            onClick={onRewind}
            className="p-2 rounded-md bg-[#161822] hover:bg-[#202332] text-zinc-300 hover:text-white border border-[#262a3d] transition-colors"
            title="Başa Dön"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={onPlayPause}
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
            title={isPlaying ? "Durdur (Space)" : "Çal (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* DAW LCD Display Unit */}
          <div className="flex items-center space-x-2.5 px-3 py-1 bg-[#090a0f] border border-[#1f2334] rounded-md font-mono text-xs text-zinc-300 shadow-inner">
            <div>
              <span className="text-[9px] text-zinc-500 block leading-tight">POS</span>
              <span className="text-zinc-200 font-semibold">
                {currentMeasure.toString().padStart(2, '0')}.{currentBeat}
              </span>
            </div>

            <div className="w-[1px] h-5 bg-[#1f2334]" />

            {/* Auto Detect BPM Box */}
            <div className="flex items-center space-x-1.5">
              <div>
                <span className="text-[9px] text-zinc-500 block leading-tight">TEMPO</span>
                <span className="text-emerald-400 font-bold">{Math.round(bpm * tempo)}</span>
              </div>
              <button
                onClick={onAutoDetectBpm}
                className="px-1.5 py-0.5 rounded bg-[#1a1d2c] hover:bg-indigo-600/30 text-indigo-400 text-[9px] font-bold tracking-tight border border-indigo-500/30 transition-colors"
                title="BPM'i Notalardan Otomatik Algıla"
              >
                AUTO
              </button>
            </div>
          </div>
        </div>

        {/* Orta Grup: Modlar & El Seçimi */}
        <div className="flex items-center space-x-2">
          {/* Çalma Modları */}
          <div className="flex items-center rounded-md bg-[#0d0e14] p-0.5 border border-[#1f2233]">
            <button
              onClick={() => onModeChange('play')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                mode === 'play'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dinle
            </button>
            <button
              onClick={() => onModeChange('practice-wait')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                mode === 'practice-wait'
                  ? 'bg-amber-500/90 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tuşa basana kadar bekler"
            >
              Etüd (Bekleme)
            </button>
            <button
              onClick={() => onModeChange('practice-rhythm')}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                mode === 'practice-rhythm'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Ritim
            </button>
          </div>

          {/* El Seçimi */}
          <div className="flex items-center rounded-md bg-[#0d0e14] p-0.5 border border-[#1f2233]">
            <span className="text-[10px] text-zinc-500 px-1.5 uppercase font-mono">El</span>
            <button
              onClick={() => onHandChange('left')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                hand === 'left' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sol
            </button>
            <button
              onClick={() => onHandChange('both')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                hand === 'both' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              İki El
            </button>
            <button
              onClick={() => onHandChange('right')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                hand === 'right' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sağ
            </button>
          </div>
        </div>

        {/* Sağ Grup: Master Volume Slider, Loop & Hız */}
        <div className="flex items-center space-x-3">
          {/* MASTER VOLUME SLIDER */}
          <div className="flex items-center space-x-2 bg-[#0d0e14] px-2.5 py-1 rounded-md border border-[#1f2233]">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
              title={volume === 0 ? "Sesi Aç" : "Sesi Kapat (Mute)"}
            >
              {volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#202434] rounded-lg cursor-pointer accent-indigo-400"
              title={`Master Ses: %${Math.round(volume * 100)}`}
            />

            <span className="text-[10px] font-mono text-zinc-400 w-7 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* A-B Loop */}
          <div className="flex items-center space-x-1 bg-[#0d0e14] p-0.5 rounded-md border border-[#1f2233]">
            <button
              onClick={onSetLoopA}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                loopStart !== null ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'
              }`}
              title="Loop Start [A]"
            >
              [A]
            </button>
            <button
              onClick={onSetLoopB}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                loopEnd !== null ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'
              }`}
              title="Loop End [B]"
            >
              [B]
            </button>
            {(loopStart !== null || loopEnd !== null) && (
              <button
                onClick={onClearLoop}
                className="px-1 text-[10px] text-rose-400 hover:text-rose-300"
                title="Sıfırla"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tempo Multiplier */}
          <div className="flex items-center space-x-1 bg-[#0d0e14] px-2 py-1 rounded-md border border-[#1f2233]">
            <select
              value={tempo}
              onChange={(e) => onTempoChange(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-mono text-zinc-300 border-none outline-none cursor-pointer"
            >
              {tempoOptions.map(t => (
                <option key={t} value={t} className="bg-[#12131a] text-white">
                  {t}x Hız
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
