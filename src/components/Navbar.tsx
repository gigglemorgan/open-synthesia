/**
 * Navbar.tsx — Ultra-Minimalist Studio Console Bar
 */

import React from 'react';
import { MidiDevice, PracticeStats } from '../types';
import { translations, Language } from '../i18n/translations';

interface NavbarProps {
  songTitle: string;
  activeDevice: MidiDevice | null;
  sustainPedalActive: boolean;
  hammerActionEnabled: boolean;
  practiceStats: PracticeStats;
  isSoundfontLoaded: boolean;
  lang: Language;
  onToggleHammerAction: () => void;
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
  hammerActionEnabled,
  practiceStats,
  isSoundfontLoaded,
  lang,
  onToggleHammerAction,
  onToggleLang,
  onOpenSongSelector,
  onOpenConverter,
  onOpenAudioPlayer,
  onOpenMidiSettings,
  onOpenKeyBindings,
}) => {
  const t = translations[lang];

  return (
    <header className="h-10 bg-[#07080a] border-b border-[#14161f] px-3 flex items-center justify-between z-40 select-none text-zinc-300">
      {/* Sol: Logo & Kütüphane */}
      <div className="flex items-center space-x-2">
        <span className="font-mono font-bold text-xs tracking-wider text-white">
          OPEN<span className="text-indigo-400">SYNTHESIA</span>
        </span>

        <div className="h-3 w-px bg-zinc-800" />

        <button
          onClick={onOpenSongSelector}
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#101218] hover:bg-[#181a24] border border-white/5 text-[11px] text-zinc-300 hover:text-white transition-colors max-w-[210px] truncate"
          title={t.library}
        >
          <span className="text-indigo-400 text-xs font-bold">♪</span>
          <span className="truncate font-medium">{songTitle}</span>
        </button>
      </div>

      {/* Orta: Hammer Action & Sustain Pedal & Metrik */}
      <div className="flex items-center space-x-2 text-[10px] font-mono">
        {/* Hammer Action Mekanizma Butonu */}
        <button
          onClick={onToggleHammerAction}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded border transition-all ${
            hammerActionEnabled
              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'bg-[#101218] border-white/5 text-zinc-500 hover:text-zinc-400'
          }`}
          title="Acoustic Grand Piano Hammer Strike & Keybed Physics"
        >
          <span>🔨</span>
          <span className="font-bold">HAMMER {hammerActionEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Sustain Pedal Lambası */}
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
            sustainPedalActive
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
              : 'bg-[#101218] border-white/5 text-zinc-600'
          }`}
          title="Sustain Pedal (CC 64) - Spacebar / MIDI Pedal / MIDI File"
        >
          {t.pedal}
        </span>

        <div className="hidden md:flex items-center space-x-2 text-zinc-500">
          <span>|</span>
          <span className="text-zinc-400">
            {t.accuracy} <strong className="text-emerald-400">%{practiceStats.accuracy}</strong>
          </span>
        </div>
      </div>

      {/* Sağ: Ayarlar, Dil ve Araçlar */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onToggleLang}
          className="px-2 py-0.5 rounded bg-[#101218] hover:bg-[#181a24] border border-white/5 text-[10px] font-mono font-bold text-zinc-300 hover:text-white transition-colors"
          title="Dil Değiştir / Switch Language"
        >
          {lang.toUpperCase()}
        </button>

        <button
          onClick={onOpenMidiSettings}
          className={`px-2 py-0.5 rounded border border-white/5 text-[11px] font-mono transition-colors ${
            activeDevice ? 'text-emerald-400 bg-emerald-950/20' : 'text-zinc-500 hover:text-zinc-300 bg-[#101218]'
          }`}
          title={t.midi}
        >
          MIDI
        </button>

        <button
          onClick={onOpenKeyBindings}
          className="p-1 px-1.5 rounded bg-[#101218] hover:bg-[#181a24] border border-white/5 text-zinc-400 hover:text-white text-xs transition-colors"
          title={t.keys}
        >
          ⌨
        </button>

        <button
          onClick={onOpenConverter}
          className="p-1 px-1.5 rounded bg-[#101218] hover:bg-[#181a24] border border-white/5 text-zinc-400 hover:text-white text-xs transition-colors"
          title={t.converter}
        >
          ⟲
        </button>

        <button
          onClick={onOpenAudioPlayer}
          className="p-1 px-1.5 rounded bg-[#101218] hover:bg-[#181a24] border border-white/5 text-zinc-400 hover:text-white text-xs transition-colors"
          title={t.player}
        >
          ♫
        </button>
      </div>
    </header>
  );
});
