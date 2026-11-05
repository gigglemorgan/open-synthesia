/**
 * Navbar.tsx
 * Ultra-Sade & Hafif Üst Konsol (Minimalist & Multi-Language)
 */

import React from 'react';
import { 
  FolderOpen, 
  Keyboard, 
  RefreshCw, 
  Headphones, 
  Cpu, 
  Globe
} from 'lucide-react';
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

export const Navbar: React.FC<NavbarProps> = ({
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
    <header className="h-11 bg-[#07080b] border-b border-[#14161f] px-3 flex items-center justify-between z-40 select-none text-zinc-300">
      {/* Sol: Minimal Marka & Eser Seçici */}
      <div className="flex items-center space-x-2.5">
        <span className="font-mono font-bold text-xs tracking-wider text-white">
          {t.appTitle}
        </span>

        <div className="h-3.5 w-[1px] bg-[#1a1c26]" />

        <button
          onClick={onOpenSongSelector}
          className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#10121a] hover:bg-[#171a26] border border-[#1f2230] text-xs text-zinc-300 hover:text-white transition-all max-w-[200px] truncate"
          title={t.library}
        >
          <FolderOpen className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate font-medium">{songTitle}</span>
        </button>
      </div>

      {/* Orta: Minimal Metrikler (Sadece gerekli olanlar) */}
      <div className="hidden md:flex items-center space-x-3 text-[11px] font-mono">
        <div className="flex items-center space-x-1.5 text-zinc-400">
          <span className={`w-1.5 h-1.5 rounded-full ${isSoundfontLoaded ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span>{isSoundfontLoaded ? 'Yamaha C5 HD' : 'Loading...'}</span>
        </div>

        <span className="text-zinc-600">|</span>

        <span className="text-zinc-300">
          {t.accuracy} <strong className="text-emerald-400">%{practiceStats.accuracy}</strong>
        </span>
      </div>

      {/* Sağ: Dil Değiştirici & Araçlar */}
      <div className="flex items-center space-x-1.5">
        {/* Dil Seçici (TR / EN) */}
        <button
          onClick={onToggleLang}
          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#10121a] hover:bg-[#171a26] border border-[#1f2230] text-[10px] font-mono font-bold text-zinc-300 hover:text-white transition-colors"
          title="Change Language / Dil Değiştir"
        >
          <Globe className="w-3 h-3 text-indigo-400" />
          <span>{lang.toUpperCase()}</span>
        </button>

        {/* Sustain Pedal Lamp */}
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all ${
            sustainPedalActive
              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
              : 'bg-[#10121a] border-[#1f2230] text-zinc-600'
          }`}
          title="Sustain Pedal (CC 64)"
        >
          {t.pedal}
        </span>

        {/* MIDI Durumu */}
        <button
          onClick={onOpenMidiSettings}
          className={`p-1.5 rounded text-xs transition-colors ${
            activeDevice ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={t.midi}
        >
          <Cpu className="w-3.5 h-3.5" />
        </button>

        {/* Klavye Haritaları */}
        <button
          onClick={onOpenKeyBindings}
          className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors"
          title={t.keys}
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* Dönüştürücü */}
        <button
          onClick={onOpenConverter}
          className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors"
          title={t.converter}
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Çalar */}
        <button
          onClick={onOpenAudioPlayer}
          className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors"
          title={t.player}
        >
          <Headphones className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
