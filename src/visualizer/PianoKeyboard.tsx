/**
 * PianoKeyboard.tsx
 * Stüdyo Tipi 88 Tuşlu Akustik Piyano Klavyesi
 * - Gerçek piyanodaki kırmızı keçe şerit (Felt strip)
 * - Fildişi beyaz ve abanoz siyah tuş kaplaması
 * - Sol el (Saf Kobalt Mavisi), Sağ el (Zümrüt Yeşili) ve Kullanıcı tuş ışıkları
 * - Bekleme modunda şık LED hedef göstergesi
 */

import React, { useMemo } from 'react';
import { PIANO_KEYS_88, isBlackKey, TOTAL_WHITE_KEYS } from './pianoLayout';
import { ActiveNote, VisualNote } from '../types';

interface PianoKeyboardProps {
  activeNotes: Map<number, ActiveNote>;
  waitingNotes?: VisualNote[];
  onNotePress?: (midi: number) => void;
  onNoteRelease?: (midi: number) => void;
  showLabels?: boolean;
  sustainPedalActive?: boolean;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes,
  waitingNotes = [],
  onNotePress,
  onNoteRelease,
  showLabels = true,
  sustainPedalActive = false,
}) => {
  const waitingMidiSet = useMemo(() => {
    return new Set(waitingNotes.map(n => n.midi));
  }, [waitingNotes]);

  const whiteKeys = useMemo(() => PIANO_KEYS_88.filter(k => !k.isBlack), []);
  const blackKeys = useMemo(() => PIANO_KEYS_88.filter(k => k.isBlack), []);

  return (
    <div className="relative w-full h-36 bg-[#0c0d12] select-none flex flex-col justify-end shadow-[0_-8px_25px_rgba(0,0,0,0.6)]">
      {/* 1. Klasik Akustik Piyano Kırmızı Keçe Şeridi (Red Felt Strip) */}
      <div className="h-1.5 w-full bg-[#831822] border-b border-[#5a1017] shadow-inner relative z-30 flex items-center justify-between px-3">
        <div className="h-[1px] w-full bg-[#9e202d] opacity-60" />
      </div>

      {/* 2. Sustain Pedal Aktif Barı */}
      {sustainPedalActive && (
        <div className="h-0.5 w-full bg-amber-400/90 shadow-[0_0_8px_#f59e0b] relative z-30 transition-all duration-100" />
      )}

      {/* 3. Klavye Alanı */}
      <div className="relative w-full h-[130px] flex">
        {/* Beyaz Tuşlar */}
        {whiteKeys.map((key) => {
          const active = activeNotes.get(key.midi);
          const isWaiting = waitingMidiSet.has(key.midi);

          // Tuş rengi
          let keyClass = 'bg-[#f4f4f5] hover:bg-[#eaeaea] text-zinc-500 border-zinc-300';
          if (isWaiting) {
            keyClass = 'bg-amber-300 text-zinc-900 shadow-[inset_0_-8px_16px_rgba(245,158,11,0.5)] border-amber-500';
          } else if (active) {
            if (active.source === 'user') {
              keyClass = 'bg-indigo-400 text-white shadow-[inset_0_-8px_16px_rgba(99,102,241,0.5)] border-indigo-600';
            } else if (active.hand === 'left') {
              keyClass = 'bg-blue-400 text-white shadow-[inset_0_-8px_16px_rgba(59,130,246,0.5)] border-blue-600';
            } else {
              keyClass = 'bg-emerald-400 text-white shadow-[inset_0_-8px_16px_rgba(16,185,129,0.5)] border-emerald-600';
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
              className={`relative flex-1 h-full border-r border-b rounded-b-[4px] cursor-pointer transition-[transform,background-color] duration-75 ${keyClass} ${
                active ? 'translate-y-[3px]' : 'shadow-[0_4px_6px_rgba(0,0,0,0.3)]'
              }`}
              style={{
                width: `${100 / TOTAL_WHITE_KEYS}%`,
              }}
            >
              {/* C tuşlarında nota adı etiketi */}
              {showLabels && (key.noteName.startsWith('C') || key.midi === 60) && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold tracking-tighter opacity-70">
                  {key.noteName}
                </span>
              )}

              {/* Bekleme hedef noktası */}
              {isWaiting && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-600 animate-ping" />
              )}
            </div>
          );
        })}

        {/* Siyah Tuşlar */}
        {blackKeys.map((key) => {
          const active = activeNotes.get(key.midi);
          const isWaiting = waitingMidiSet.has(key.midi);

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

          let blackClass = 'bg-[#18191f] border-[#0e0f14] shadow-[0_4px_8px_rgba(0,0,0,0.7)]';
          if (isWaiting) {
            blackClass = 'bg-amber-400 border-amber-600 shadow-[0_0_12px_#f59e0b]';
          } else if (active) {
            if (active.source === 'user') {
              blackClass = 'bg-indigo-500 border-indigo-700 shadow-[0_0_10px_#6366f1]';
            } else if (active.hand === 'left') {
              blackClass = 'bg-blue-500 border-blue-700 shadow-[0_0_10px_#3b82f6]';
            } else {
              blackClass = 'bg-emerald-500 border-emerald-700 shadow-[0_0_10px_#10b981]';
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
              className={`absolute top-0 h-[64%] rounded-b-[3px] border cursor-pointer z-20 transition-[transform,background-color] duration-75 ${blackClass} ${
                active ? 'translate-y-[2px]' : ''
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
            >
              {/* Siyah tuş üst mat fırçalı çizgisi */}
              <div className="absolute top-1 left-0.5 right-0.5 h-[1px] bg-white/10 rounded-full" />

              {isWaiting && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
