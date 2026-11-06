/**
 * PlaybackControls.tsx — Featherweight DAW Transport Bar
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

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

export const PlaybackControls: React.FC<PlaybackControlsProps> = React.memo(({
  isPlaying, currentTime, duration, bpm, mode, hand, tempo, volume, lang,
  onVolumeChange, onPlayPause, onRewind, onSeek, onModeChange, onHandChange,
  onTempoChange, onAutoDetectBpm,
}) => {
  const [prevVol, setPrevVol] = useState(0.85);
  const t = translations[lang];

  const toggleMute = () => {
    if (volume > 0) { setPrevVol(volume); onVolumeChange(0); }
    else { onVolumeChange(prevVol > 0 ? prevVol : 0.85); }
  };

  const measure = Math.floor((currentTime * (bpm / 60)) / 4) + 1;
  const beat = (Math.floor(currentTime * (bpm / 60)) % 4) + 1;

  const pill = (active: boolean, color: string) =>
    active ? `${color} text-white font-medium shadow-xs` : 'text-zinc-500 hover:text-zinc-300';

  return (
    <div className="bg-[#07080a] border-t border-[#14161f] px-3 py-1.5 select-none flex flex-col gap-1.5 text-zinc-300">
      {/* Precision Timeline Scrubber */}
      <div className="flex items-center gap-2.5 w-full">
        <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{fmt(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={0.05}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1 bg-[#141622] rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
        />
        <span className="text-[10px] font-mono text-zinc-500 w-10">{fmt(duration)}</span>
      </div>

      {/* Main Transport Bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Sol: Play / Pause & Rewind & BPM */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRewind}
            className="p-1 px-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/5 text-xs transition-colors"
            title={t.rewind}
          >
            ⟲
          </button>

          <button
            onClick={onPlayPause}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${
              isPlaying ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0d0e14] border border-white/5 font-mono text-[10px] text-zinc-400">
            <span>{measure}.{beat}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-bold">{Math.round(bpm * tempo)} BPM</span>
            <button
              onClick={onAutoDetectBpm}
              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold ml-1"
              title="Detect BPM"
            >
              {t.autoBpm}
            </button>
          </div>
        </div>

        {/* Orta: Modlar & El Seçimi */}
        <div className="flex items-center gap-1 text-xs">
          <div className="flex rounded bg-[#0d0e14] p-0.5 border border-white/5">
            <button onClick={() => onModeChange('play')} className={`px-2 py-0.5 rounded text-[11px] ${pill(mode === 'play', 'bg-zinc-800')}`}>
              {t.listen}
            </button>
            <button onClick={() => onModeChange('practice-wait')} className={`px-2 py-0.5 rounded text-[11px] ${pill(mode === 'practice-wait', 'bg-amber-500 !text-zinc-950')}`}>
              {t.practiceWait}
            </button>
            <button onClick={() => onModeChange('practice-rhythm')} className={`px-2 py-0.5 rounded text-[11px] ${pill(mode === 'practice-rhythm', 'bg-indigo-600')}`}>
              {t.practiceRhythm}
            </button>
          </div>

          <div className="hidden sm:flex rounded bg-[#0d0e14] p-0.5 border border-white/5">
            <button onClick={() => onHandChange('left')} className={`px-1.5 py-0.5 rounded text-[10px] ${pill(hand === 'left', 'bg-sky-600')}`}>
              {t.handLeft}
            </button>
            <button onClick={() => onHandChange('both')} className={`px-1.5 py-0.5 rounded text-[10px] ${pill(hand === 'both', 'bg-zinc-800')}`}>
              {t.handBoth}
            </button>
            <button onClick={() => onHandChange('right')} className={`px-1.5 py-0.5 rounded text-[10px] ${pill(hand === 'right', 'bg-emerald-600')}`}>
              {t.handRight}
            </button>
          </div>
        </div>

        {/* Sağ: Ses & Tempo */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#0d0e14] px-1.5 py-0.5 rounded border border-white/5">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white text-xs">
              {volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-14 h-1 bg-[#181a26] rounded-full appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          <select
            value={tempo}
            onChange={(e) => onTempoChange(parseFloat(e.target.value))}
            className="bg-[#0d0e14] border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 outline-none cursor-pointer"
          >
            {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(v => (
              <option key={v} value={v} className="bg-[#101218]">
                {v}x
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});
