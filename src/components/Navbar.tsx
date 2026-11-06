/**
 * Navbar.tsx — Ultra-lightweight top bar. Memoized to prevent re-renders.
 */

import React from 'react';
import { MidiDevice, PracticeStats } from '../types';
import { translations, Language } from '../i18n/translations';

interface NavbarProps {
  songTitle: string;
  activeDevice: MidiDevice | null;
  sustainPedalActive: boolean;
  practiceStats: PracticeStats;
  isSoundfontLoaded: boolean;
  lang: Language;
  onToggleLang: () => void;
  onOpenSongSelector: () => void;
  onOpenConverter: () => void;
  onOpenAudioPlayer: () => void;
  onOpenMidiSettings: () => void;
  onOpenKeyBindings: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  songTitle,
  activeDevice,
  sustainPedalActive,
  practiceStats,
  isSoundfontLoaded,
  lang,
  onToggleLang,
  onOpenSongSelector,
  onOpenConverter,
  onOpenAudioPlayer,
  onOpenMidiSettings,
  onOpenKeyBindings,
}) => {
  const t = translations[lang];

  return (
    <header className="h-10 bg-[#07080b] border-b border-[#14161f] px-3 flex items-center justify-between z-40 select-none text-zinc-300">
      {/* Left */}
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-[11px] tracking-wider text-white">{t.appTitle}</span>
        <div className="h-3 w-px bg-[#1a1c26]" />
        <button
          onClick={onOpenSongSelector}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#10121a] hover:bg-[#171a26] border border-[#1f2230] text-[11px] text-zinc-300 hover:text-white max-w-[180px] truncate"
        >
          <span className="text-indigo-400 text-xs">♪</span>
          <span className="truncate">{songTitle}</span>
        </button>
      </div>

      {/* Center */}
      <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-zinc-400">
        <span className={`w-1.5 h-1.5 rounded-full ${isSoundfontLoaded ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
        <span>{isSoundfontLoaded ? 'C5 Grand' : '...'}</span>
        <span className="text-zinc-600">|</span>
        <span>{t.accuracy} <strong className="text-emerald-400">%{practiceStats.accuracy}</strong></span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button onClick={onToggleLang} className="px-1.5 py-0.5 rounded bg-[#10121a] hover:bg-[#171a26] border border-[#1f2230] text-[10px] font-mono font-bold text-zinc-300 hover:text-white">
          {lang.toUpperCase()}
        </button>
        <span className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold border ${sustainPedalActive ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-[#10121a] border-[#1f2230] text-zinc-600'}`}>
          {t.pedal}
        </span>
        <button onClick={onOpenMidiSettings} className={`p-1 rounded text-[11px] ${activeDevice ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`} title={t.midi}>
          ⎚
        </button>
        <button onClick={onOpenKeyBindings} className="p-1 rounded text-zinc-400 hover:text-white text-[11px]" title={t.keys}>⌨</button>
        <button onClick={onOpenConverter} className="p-1 rounded text-zinc-400 hover:text-white text-[11px]" title={t.converter}>⟲</button>
        <button onClick={onOpenAudioPlayer} className="p-1 rounded text-zinc-400 hover:text-white text-[11px]" title={t.player}>♫</button>
      </div>
    </header>
  );
});
