/**
 * Navbar.tsx — 0.1g Featherweight Minimalist Studio Header
 */

import React from 'react';
import { Language } from '../i18n/translations';

interface NavbarProps {
  songTitle: string;
  sustainPedalActive: boolean;
  lang: Language;
  onToggleLang: () => void;
  onOpenSongSelector: () => void;
  onOpenTools: () => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  songTitle,
  sustainPedalActive,
  lang,
  onToggleLang,
  onOpenSongSelector,
  onOpenTools,
}) => {
  return (
    <header className="h-8 bg-[#060709] border-b border-[#12131a] px-3 flex items-center justify-between z-40 select-none text-zinc-300">
      {/* Sol: Logo */}
      <div className="flex items-center space-x-2">
        <span className="font-mono font-bold text-[11px] tracking-wider text-zinc-200">
          OPEN<span className="text-indigo-400">SYNTHESIA</span>
        </span>
      </div>

      {/* Orta: Parça Seçimi & Sustain Pedal Rozeti */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenSongSelector}
          className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#0d0e14] hover:bg-[#151722] border border-white/5 text-[11px] text-zinc-300 hover:text-white transition-colors max-w-[240px] truncate"
          title="Parça Seç / Kütüphane"
        >
          <span className="text-indigo-400 text-xs">♪</span>
          <span className="truncate font-medium">{songTitle}</span>
          <span className="text-[9px] text-zinc-500">▾</span>
        </button>

        {sustainPedalActive && (
          <span
            className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 border border-amber-500/60 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse"
            title="Sustain Pedal Active"
          >
            PEDAL
          </span>
        )}
      </div>

      {/* Sağ: Dil & Araçlar (⋯) */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onToggleLang}
          className="px-2 py-0.5 rounded bg-[#0d0e14] hover:bg-[#151722] border border-white/5 text-[10px] font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Dil Değiştir / Switch Language"
        >
          {lang.toUpperCase()}
        </button>

        <button
          onClick={onOpenTools}
          className="w-6 h-6 flex items-center justify-center rounded bg-[#0d0e14] hover:bg-[#151722] border border-white/5 text-zinc-400 hover:text-white text-xs transition-colors"
          title="Araçlar & Ayarlar / Tools"
        >
          ⋯
        </button>
      </div>
    </header>
  );
});
