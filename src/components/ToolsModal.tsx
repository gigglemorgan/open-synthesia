/**
 * ToolsModal.tsx
 * Ultra-Clean Unified Settings & Tools Modal
 */

import React from 'react';
import { Language, translations } from '../i18n/translations';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  hammerActionEnabled: boolean;
  showKeyBindings: boolean;
  activeDeviceName: string | null;
  onToggleHammerAction: () => void;
  onToggleKeyBindings: () => void;
  onOpenMidiSettings: () => void;
  onOpenKeyBindings: () => void;
  onOpenConverter: () => void;
  onOpenAudioPlayer: () => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  lang,
  hammerActionEnabled,
  showKeyBindings,
  activeDeviceName,
  onToggleHammerAction,
  onToggleKeyBindings,
  onOpenMidiSettings,
  onOpenKeyBindings,
  onOpenConverter,
  onOpenAudioPlayer,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0a0c10] border border-white/10 rounded-xl p-4 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-indigo-400 font-mono text-sm">⋯</span>
            <h2 className="text-sm font-semibold text-zinc-100">
              {lang === 'tr' ? 'Araçlar & Ayarlar' : 'Tools & Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        {/* Ana Araçlar */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => { onClose(); onOpenMidiSettings(); }}
            className="flex flex-col items-start p-3 rounded-lg bg-[#11131a] hover:bg-[#181b26] border border-white/5 text-left transition-colors group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-base">🎹</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${activeDeviceName ? 'text-emerald-400 bg-emerald-950/40' : 'text-zinc-500'}`}>
                {activeDeviceName ? 'ONLINE' : 'OFF'}
              </span>
            </div>
            <span className="font-medium text-zinc-200 group-hover:text-white">{t.midi}</span>
            <span className="text-[10px] text-zinc-500 truncate max-w-[130px]">
              {activeDeviceName || (lang === 'tr' ? 'Cihaz bağlı değil' : 'No device')}
            </span>
          </button>

          <button
            onClick={() => { onClose(); onOpenKeyBindings(); }}
            className="flex flex-col items-start p-3 rounded-lg bg-[#11131a] hover:bg-[#181b26] border border-white/5 text-left transition-colors group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-base">⌨</span>
              <span className="text-[10px] font-mono text-zinc-500">PC</span>
            </div>
            <span className="font-medium text-zinc-200 group-hover:text-white">{t.keys}</span>
            <span className="text-[10px] text-zinc-500">
              {lang === 'tr' ? 'Tuş haritası' : 'Key mappings'}
            </span>
          </button>

          <button
            onClick={() => { onClose(); onOpenConverter(); }}
            className="flex flex-col items-start p-3 rounded-lg bg-[#11131a] hover:bg-[#181b26] border border-white/5 text-left transition-colors group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-base">🔄</span>
              <span className="text-[10px] font-mono text-indigo-400">MP3/MID</span>
            </div>
            <span className="font-medium text-zinc-200 group-hover:text-white">{t.converter}</span>
            <span className="text-[10px] text-zinc-500">
              {lang === 'tr' ? 'Ses dönüştürücü' : 'Audio converter'}
            </span>
          </button>

          <button
            onClick={() => { onClose(); onOpenAudioPlayer(); }}
            className="flex flex-col items-start p-3 rounded-lg bg-[#11131a] hover:bg-[#181b26] border border-white/5 text-left transition-colors group"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-base">🎧</span>
              <span className="text-[10px] font-mono text-zinc-500">DAW</span>
            </div>
            <span className="font-medium text-zinc-200 group-hover:text-white">{t.player}</span>
            <span className="text-[10px] text-zinc-500">
              {lang === 'tr' ? 'Ses çalar & dinle' : 'Audio monitor'}
            </span>
          </button>
        </div>

        {/* Seçenekler / Toggles */}
        <div className="space-y-1.5 pt-1 border-t border-white/5 text-xs">
          <div className="flex items-center justify-between py-1.5 px-2 rounded bg-[#101218]">
            <span className="text-zinc-300 flex items-center space-x-1.5">
              <span>🔨</span>
              <span>{lang === 'tr' ? 'Çekiç Aksiyonu' : 'Hammer Action'}</span>
            </span>
            <button
              onClick={onToggleHammerAction}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                hammerActionEnabled
                  ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {hammerActionEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between py-1.5 px-2 rounded bg-[#101218]">
            <span className="text-zinc-300 flex items-center space-x-1.5">
              <span>🏷</span>
              <span>{lang === 'tr' ? 'Tuş İsimleri / Harfler' : 'Key Labels'}</span>
            </span>
            <button
              onClick={onToggleKeyBindings}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                showKeyBindings
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {showKeyBindings ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="text-center pt-1">
          <span className="text-[10px] font-mono text-zinc-600">
            OpenSynthesia Studio • 0.1g Featherweight
          </span>
        </div>
      </div>
    </div>
  );
};
