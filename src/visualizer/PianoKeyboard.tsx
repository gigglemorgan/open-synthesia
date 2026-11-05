/**
 * PianoKeyboard.tsx
 * 88 Tuşlu İnteraktif Piyano Klavyesi
 * - Gerçekçi 3D tuş tasarımı ve basış animasyonları
 * - MIDI klavye ve fare/dokunma desteği
 * - Sol el (Mavi), Sağ el (Yeşil) ve Kullanıcı tuş renklendirmesi
 * - Etüd bekleme modunda basılması gereken tuşların parlaması
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

  // Separate white and black keys for rendering layers
  const whiteKeys = useMemo(() => PIANO_KEYS_88.filter(k => !k.isBlack), []);
  const blackKeys = useMemo(() => PIANO_KEYS_88.filter(k => k.isBlack), []);

  const getKeyColor = (midi: number, isBlack: boolean): string => {
    const active = activeNotes.get(midi);
    const isWaiting = waitingMidiSet.has(midi);

    if (isWaiting) {
      return 'bg-amber-400 animate-pulse shadow-[0_0_15px_#f59e0b]';
    }

    if (active) {
      if (active.source === 'user') {
        return 'bg-violet-500 shadow-[0_0_15px_#8b5cf6]';
      }
      if (active.hand === 'left') {
        return 'bg-blue-500 shadow-[0_0_12px_#3b82f6]';
      }
      return 'bg-emerald-500 shadow-[0_0_12px_#10b981]';
    }

    if (isBlack) {
      return 'bg-gradient-to-b from-[#181a20] via-[#232733] to-[#12141a] border-gray-900';
    }

    return 'bg-gradient-to-b from-gray-100 via-white to-gray-200 border-gray-300';
  };

  return (
    <div className="relative w-full h-36 bg-[#0e1017] select-none border-t-2 border-indigo-500/30 shadow-2xl flex flex-col justify-end">
      {/* Sustain Pedal indicator glow bar */}
      {sustainPedalActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400 shadow-[0_0_10px_#f59e0b] z-30 transition-opacity" />
      )}

      {/* Keyboard container */}
      <div className="relative w-full h-32 flex">
        {/* White Keys Layer */}
        {whiteKeys.map((key) => {
          const isActive = activeNotes.has(key.midi);
          const isWaiting = waitingMidiSet.has(key.midi);
          const colorClass = getKeyColor(key.midi, false);

          return (
            <div
              key={key.midi}
              onMouseDown={() => onNotePress?.(key.midi)}
              onMouseUp={() => onNoteRelease?.(key.midi)}
              onMouseLeave={() => onNoteRelease?.(key.midi)}
              onTouchStart={(e) => { e.preventDefault(); onNotePress?.(key.midi); }}
              onTouchEnd={(e) => { e.preventDefault(); onNoteRelease?.(key.midi); }}
              className={`relative flex-1 h-full border-r border-b rounded-b-md cursor-pointer transition-transform duration-75 active:scale-[0.98] ${colorClass} ${
                isActive ? 'translate-y-1 shadow-inner' : 'shadow-md'
              }`}
              style={{
                width: `${100 / TOTAL_WHITE_KEYS}%`,
              }}
            >
              {/* Note Name on C keys */}
              {showLabels && (key.noteName.startsWith('C') || key.midi === 60) && (
                <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold ${
                  isActive || isWaiting ? 'text-white' : 'text-gray-500'
                }`}>
                  {key.noteName}
                </span>
              )}

              {/* Waiting note target dot */}
              {isWaiting && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-lg animate-ping" />
              )}
            </div>
          );
        })}

        {/* Black Keys Layer */}
        {blackKeys.map((key) => {
          const isActive = activeNotes.has(key.midi);
          const isWaiting = waitingMidiSet.has(key.midi);
          const colorClass = getKeyColor(key.midi, true);

          // Find preceding white key index
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

          return (
            <div
              key={key.midi}
              onMouseDown={(e) => { e.stopPropagation(); onNotePress?.(key.midi); }}
              onMouseUp={(e) => { e.stopPropagation(); onNoteRelease?.(key.midi); }}
              onMouseLeave={() => onNoteRelease?.(key.midi)}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onNotePress?.(key.midi); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onNoteRelease?.(key.midi); }}
              className={`absolute top-0 h-[62%] rounded-b-sm border cursor-pointer z-20 transition-transform duration-75 active:scale-[0.98] ${colorClass} ${
                isActive ? 'translate-y-1' : 'shadow-xl'
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
              }}
            >
              {isWaiting && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-lg animate-ping" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
