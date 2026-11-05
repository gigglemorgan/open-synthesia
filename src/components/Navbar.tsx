/**
 * Navbar.tsx
 * Stüdyo Tipi Üst Durum & Navigasyon Çubuğu
 */

import React from 'react';
import { 
  Cpu, 
  RefreshCw, 
  Headphones, 
  Music2, 
  FolderOpen,
  Keyboard
} from 'lucide-react';
import { MidiDevice, PracticeStats } from '../types';

interface NavbarProps {
  songTitle: string;
  activeDevice: MidiDevice | null;
  sustainPedalActive: boolean;
  practiceStats: PracticeStats;
  isSoundfontLoaded: boolean;
  soundfontProgress: number;
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
  soundfontProgress,
  onOpenSongSelector,
  onOpenConverter,
  onOpenAudioPlayer,
  onOpenMidiSettings,
  onOpenKeyBindings,
}) => {
  return (
    <header className="h-12 bg-[#0d0e14] border-b border-[#1f2230] px-3.5 flex items-center justify-between z-40 select-none">
      {/* Sol: Logo & Parça Seçimi */}
      <div className="flex items-center space-x-3">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
            <Music2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-zinc-100 tracking-wider uppercase font-mono">
            OpenSynthesia <span className="text-[10px] text-zinc-500">v1.2</span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#1f2230]" />

        {/* Parça Seçici */}
        <button
          onClick={onOpenSongSelector}
          className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#161822] hover:bg-[#1e2130] border border-[#272b3d] text-xs text-zinc-200 transition-colors max-w-[240px] truncate group"
          title="Parça Değiştir / MIDI Yükle"
        >
          <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:text-indigo-300" />
          <span className="truncate font-medium">{songTitle}</span>
        </button>
      </div>

      {/* Orta: Ses Motoru & Performans Metrikleri */}
      <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
        {/* Anti-Clip Limiter & Sound Status */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#141620] border border-[#232738] text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${isSoundfontLoaded ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-zinc-400">
            {isSoundfontLoaded ? 'Steinway Grand HD • Limiter 0dB' : `Ses Yükleniyor: %${soundfontProgress}`}
          </span>
        </div>

        {/* Practice Stats */}
        <div className="flex items-center space-x-2 px-2.5 py-0.5 rounded bg-[#141620] border border-[#232738] text-[11px]">
          <span className="text-emerald-400">DOĞRULUK %{practiceStats.accuracy}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-amber-400">SERİ: {practiceStats.currentStreak}</span>
        </div>
      </div>

      {/* Sağ: Donanım & Araçlar */}
      <div className="flex items-center space-x-2">
        {/* Sustain Pedal Lamp */}
        <div className={`flex items-center space-x-1.5 px-2 py-1 rounded border text-[10px] font-mono font-bold transition-all ${
          sustainPedalActive
            ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-[0_0_8px_#f59e0b]'
            : 'bg-[#141620] border-[#222536] text-zinc-500'
        }`}
        title="Sustain Pedalı Durumu (CC 64)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sustainPedalActive ? 'bg-amber-400' : 'bg-zinc-700'}`} />
          <span>PEDAL</span>
        </div>

        {/* MIDI Cihazı */}
        <button
          onClick={onOpenMidiSettings}
          className={`flex items-center space-x-1.5 px-2 py-1 rounded border text-xs font-mono transition-colors ${
            activeDevice
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-[#141620] border-[#222536] text-zinc-400 hover:text-zinc-200'
          }`}
          title="MIDI Cihazı Ayarları"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden lg:inline max-w-[120px] truncate text-[11px]">
            {activeDevice ? activeDevice.name : 'MIDI'}
          </span>
        </button>

        {/* Klavye Tuş Atamaları */}
        <button
          onClick={onOpenKeyBindings}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-[#161822] hover:bg-[#202332] border border-[#262b3d] text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          title="Bilgisayar Klavyesi Atamaları & Oktav"
        >
          <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline text-[11px]">Tuşlar</span>
        </button>

        {/* Format Dönüştürücü */}
        <button
          onClick={onOpenConverter}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#161822] hover:bg-[#202332] border border-[#262b3d] text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          title=".mid ⇄ .mp3 Dönüştürücü"
        >
          <RefreshCw className="w-3 h-3 text-indigo-400" />
          <span className="hidden sm:inline">Dönüştürücü</span>
        </button>

        {/* Dahili Çalar */}
        <button
          onClick={onOpenAudioPlayer}
          className="p-1.5 rounded bg-[#161822] hover:bg-[#202332] border border-[#262b3d] text-zinc-300 hover:text-white transition-colors"
          title="Dahili Ses Çalar"
        >
          <Headphones className="w-3.5 h-3.5 text-zinc-300" />
        </button>

        {/* GitHub Link */}
        <a
          href="https://github.com/gigglemorgan/open-synthesia"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded bg-[#161822] hover:bg-[#202332] border border-[#262b3d] text-zinc-400 hover:text-white transition-colors"
          title="GitHub: gigglemorgan/open-synthesia"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
        </a>
      </div>
    </header>
  );
};
