/**
 * Navbar.tsx
 * Üst Kontrol & Bilgi Çubuğu
 */

import React from 'react';
import { Music, Cpu, RefreshCw, Headphones, Award, Volume2 } from 'lucide-react';
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
}) => {
  return (
    <header className="h-14 bg-[#12141c] border-b border-[#232738] px-4 flex items-center justify-between z-40 select-none">
      {/* Sol: Logo & Parça Seçici */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm">
            🎹
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent font-extrabold">
            OpenSynthesia
          </span>
        </div>

        <button
          onClick={onOpenSongSelector}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#1a1d28] hover:bg-[#242838] border border-[#2e334a] text-sm text-gray-200 transition-colors shadow-sm max-w-[220px] truncate"
          title="Parça Değiştir veya MIDI Yükle"
        >
          <Music className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="truncate font-medium">{songTitle}</span>
        </button>
      </div>

      {/* Orta: Etüd & Ses Durumu */}
      <div className="hidden md:flex items-center space-x-4">
        {/* Practice Stats Pill */}
        <div className="flex items-center space-x-3 px-3 py-1 rounded-full bg-[#181b26] border border-[#292f44] text-xs">
          <div className="flex items-center space-x-1 text-emerald-400 font-medium">
            <Award className="w-3.5 h-3.5" />
            <span>Doğruluk: %{practiceStats.accuracy}</span>
          </div>
          <div className="w-px h-3 bg-[#2d334d]" />
          <div className="text-amber-400 font-medium">
            Seri: {practiceStats.currentStreak} 🔥
          </div>
        </div>

        {/* Soundfont Loaded Indicator */}
        <div className="flex items-center space-x-1.5 text-xs text-gray-400">
          <Volume2 className={`w-3.5 h-3.5 ${isSoundfontLoaded ? 'text-indigo-400' : 'text-amber-400 animate-spin'}`} />
          <span>{isSoundfontLoaded ? 'Akustik Piyano HD' : `Sesler Yükleniyor: %${soundfontProgress}`}</span>
        </div>
      </div>

      {/* Sağ: Araçlar & Donanım Butonları */}
      <div className="flex items-center space-x-2">
        {/* MIDI -> MP3 & MP3 -> MIDI Converter */}
        <button
          onClick={onOpenConverter}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition-all shadow-sm"
          title=".mid ⇄ .mp3 Dönüştürücü"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dönüştürücü (.mid ⇄ .mp3)</span>
        </button>

        {/* Audio Player */}
        <button
          onClick={onOpenAudioPlayer}
          className="p-2 rounded-lg bg-[#1a1d28] hover:bg-[#242838] border border-[#2e334a] text-gray-300 hover:text-white transition-colors"
          title="Dahili Müzik Çalar"
        >
          <Headphones className="w-4 h-4 text-emerald-400" />
        </button>

        {/* MIDI Keyboard & Sustain Status */}
        <button
          onClick={onOpenMidiSettings}
          className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeDevice 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-[#1a1d28] border-[#2e334a] text-gray-400 hover:text-gray-200'
          }`}
          title="MIDI Klavye ve Pedal Ayarları"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden lg:inline max-w-[100px] truncate">
            {activeDevice ? activeDevice.name : 'MIDI Klavye'}
          </span>
          {/* Sustain pedal badge */}
          {sustainPedalActive && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" title="Sustain Pedal Basılı" />
          )}
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/gigglemorgan/open-synthesia"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-[#1a1d28] hover:bg-[#242838] border border-[#2e334a] text-gray-400 hover:text-white transition-colors"
          title="GitHub: gigglemorgan/open-synthesia"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
          </svg>
        </a>
      </div>
    </header>
  );
};
