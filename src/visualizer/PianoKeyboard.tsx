/**
 * PianoKeyboard.tsx
 * Modern, Minimalist 88 Tuşlu Piyano Klavyesi
 * - Bilgisayar klavyesi tuş harfleri (Q, W, E, R, T...) tuşların üzerinde
 * - Zarif kırmızı keçe şerit ve modern mat kaplama
 * - Akıcı basış animasyonları ve LED ışıklandırma
 */

import React, { useMemo } from 'react';
import { PIANO_KEYS_88, isBlackKey, TOTAL_WHITE_KEYS } from './pianoLayout';
import { ActiveNote, VisualNote } from '../types';
import { midiManager } from '../midi/MidiManager';

interface PianoKeyboardProps {
  activeNotes: Map<number, ActiveNote>;
  waitingNotes?: VisualNote[];
  onNotePress?: (midi: number) => void;
  onNoteRelease?: (midi: number) => void;
  showLabels?: boolean;
  showKeyBindings?: boolean;
  sustainPedalActive?: boolean;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes,
  waitingNotes = [],
  onNotePress,
  onNoteRelease,
  showLabels = true,
  showKeyBindings = true,
  sustainPedalActive = false,
}) => {
  const waitingMidiSet = useMemo(() => {
    return new Set(waitingNotes.map(n => n.midi));
  }, [waitingNotes]);

  const whiteKeys = useMemo(() => PIANO_KEYS_88.filter(k => !k.isBlack), []);
  const blackKeys = useMemo(() => PIANO_KEYS_88.filter(k => k.isBlack), []);

  return (
    <div className="relative w-full h-32 bg-[#0a0b0e] select-none flex flex-col justify-end shadow-2xl border-t border-[#181a24]">
      {/* İnce Kırmızı Keçe Çizgisi (Red Felt Line) */}
      <div className="h-1 w-full bg-[#991b1b] relative z-30" />

      {/* Sustain Pedal İnce Işık Çubuğu */}
      {sustainPedalActive && (
        <div className="h-0.5 w-full bg-amber-400 shadow-[0_0_8px_#f59e0b] relative z-30 transition-all duration-75" />
      )}

      {/* Klavye Tuş Alanı */}
      <div className="relative w-full h-[122px] flex">
        {/* Beyaz Tuşlar */}
        {whiteKeys.map((key) => {
          const active = activeNotes.get(key.midi);
          const isWaiting = waitingMidiSet.has(key.midi);
          const keyLetter = showKeyBindings ? midiManager.getKeyForMidi(key.midi) : null;

          let keyBg = 'bg-[#f8f9fa] hover:bg-[#edeef0] text-zinc-600 border-zinc-300/80';
          if (isWaiting) {
            keyBg = 'bg-amber-300 text-zinc-900 border-amber-500 shadow-[inset_0_-8px_12px_rgba(245,158,11,0.4)]';
          } else if (active) {
            if (active.source === 'user') {
              keyBg = 'bg-indigo-400 text-white border-indigo-600 shadow-[inset_0_-8px_12px_rgba(99,102,241,0.5)]';
            } else if (active.hand === 'left') {
              keyBg = 'bg-sky-400 text-white border-sky-600 shadow-[inset_0_-8px_12px_rgba(56,189,248,0.5)]';
            } else {
              keyBg = 'bg-emerald-400 text-white border-emerald-600 shadow-[inset_0_-8px_12px_rgba(52,211,153,0.5)]';
            }
          }

          return (
            <div
              key={key.midi}
              onMouseDown={() => onNotePress?.(key.midi)}
              onMouseUp={() => onNoteRelease?.(key.midi)}
              onMouseLeave={() => onNoteRelease?.(key.midi)}
              onTouchStart={(e) => { e.preventDefault(); onNotePress?.(key.midi); }}
              onTouchEnd={(e) => { e.preventDefault(); onNoteRelease?.(key.midi); }}
              className={`relative flex-1 h-full border-r border-b rounded-b-[3px] cursor-pointer transition-all duration-75 ${keyBg} ${
                active ? 'translate-y-[2px]' : 'shadow-sm'
              }`}
              style={{ width: `${100 / TOTAL_WHITE_KEYS}%` }}
            >
              {/* Klavye Tuş Harfi (örn: Q, W, E...) */}
              {keyLetter && (
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-zinc-200/90 text-[9px] font-mono font-bold text-zinc-800 flex items-center justify-center shadow-xs">
                  {keyLetter}
                </span>
              )}

              {/* Nota Adı (C3, C4...) */}
              {showLabels && (key.noteName.startsWith('C') || key.midi === 60) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold opacity-60">
                  {key.noteName}
                </span>
              )}

              {isWaiting && (
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
          );
        })}

        {/* Siyah Tuşlar */}
        {blackKeys.map((key) => {
          const active = activeNotes.get(key.midi);
          const isWaiting = waitingMidiSet.has(key.midi);
          const keyLetter = showKeyBindings ? midiManager.getKeyForMidi(key.midi) : null;

          let prevWhiteIndex = 0;
          for (let m = key.midi - 1; m >= 21; m--) {
            if (!isBlackKey(m)) {
              const wk = whiteKeys.find(w => w.midi === m);
              if (wk) {
                prevWhiteIndex = wk.whiteIndex;
                break;
              }
            }
          }

          const whiteKeyPercent = 100 / TOTAL_WHITE_KEYS;
          const leftPercent = (prevWhiteIndex + 0.68) * whiteKeyPercent;
          const widthPercent = whiteKeyPercent * 0.65;

          let blackBg = 'bg-[#15171e] border-[#0c0d12] shadow-md';
          if (isWaiting) {
            blackBg = 'bg-amber-400 border-amber-600 shadow-[0_0_10px_#f59e0b]';
          } else if (active) {
            if (active.source === 'user') {
              blackBg = 'bg-indigo-500 border-indigo-700 shadow-[0_0_8px_#6366f1]';
            } else if (active.hand === 'left') {
              blackBg = 'bg-sky-500 border-sky-700 shadow-[0_0_8px_#0ea5e9]';
            } else {
              blackBg = 'bg-emerald-500 border-emerald-700 shadow-[0_0_8px_#10b981]';
            }
          }

          return (
            <div
              key={key.midi}
              onMouseDown={(e) => { e.stopPropagation(); onNotePress?.(key.midi); }}
              onMouseUp={(e) => { e.stopPropagation(); onNoteRelease?.(key.midi); }}
              onMouseLeave={() => onNoteRelease?.(key.midi)}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onNotePress?.(key.midi); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onNoteRelease?.(key.midi); }}
              className={`absolute top-0 h-[64%] rounded-b-[2px] border cursor-pointer z-20 transition-all duration-75 flex flex-col justify-end items-center pb-1 ${blackBg} ${
                active ? 'translate-y-[2px]' : ''
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
            >
              {keyLetter && (
                <span className="w-3.5 h-3.5 rounded bg-zinc-800 text-[8px] font-mono font-bold text-amber-300 flex items-center justify-center border border-zinc-700">
                  {keyLetter}
                </span>
              )}

              {isWaiting && (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping mb-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
