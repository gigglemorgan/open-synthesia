/**
 * SongSelectorModal.tsx
 * Eser Seçici & Özel .MID Dosyası Yükleyici
 */

import React from 'react';
import { X, FolderOpen, UploadCloud, Clock, Hash, Play } from 'lucide-react';
import { SAMPLE_SONGS } from '../data/sampleSongs';
import { LoadedSong } from '../types';
import { MidiParser } from '../midi/MidiParser';

interface SongSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onSelectSong: (song: LoadedSong) => void;
}

export const SongSelectorModal: React.FC<SongSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTitle,
  onSelectSong,
}) => {
  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadedSong = MidiParser.parse(arrayBuffer, file.name);
      onSelectSong(loadedSong);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'MIDI dosyası okunamadı.';
      alert(`MIDI Hatası: ${msg}`);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadedSong = MidiParser.parse(arrayBuffer, file.name);
        onSelectSong(loadedSong);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'MIDI dosyası okunamadı.';
        alert(`MIDI Hatası: ${msg}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111218] border border-[#232738] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#202436] flex items-center justify-between bg-[#0d0e14]">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider">
              Eser Kütüphanesi & MIDI Yükleme
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#1a1d2c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Sürükle Bırak / Özel MIDI Yükle */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-4 rounded-lg border border-dashed border-[#262a3d] text-center hover:border-indigo-500/50 transition-colors bg-[#0d0e14]"
          >
            <input
              type="file"
              accept=".mid,.midi"
              id="song-selector-midi-file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="song-selector-midi-file"
              className="cursor-pointer flex flex-col items-center space-y-1"
            >
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Kendi .mid Dosyanızı Yükleyin
              </span>
              <span className="text-[10px] text-zinc-500">
                Sürükleyip bırakın veya dosyayı seçin
              </span>
            </label>
          </div>

          {/* Hazır Klasik Eserler */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 px-1">
              Klasik Etüd & Eserler
            </span>

            <div className="space-y-1.5">
              {SAMPLE_SONGS.map((song, idx) => {
                const isSelected = song.metadata.title === currentTitle;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/60 shadow-sm'
                        : 'bg-[#0f1016] border-[#1e2230] hover:bg-[#161822] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-[#1b1e2c] text-zinc-400 group-hover:text-zinc-200'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                          {song.metadata.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono">{song.metadata.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center space-x-1">
                        <Hash className="w-3 h-3 text-indigo-400" />
                        <span>{song.notes.length}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{Math.round(song.metadata.duration)}s</span>
                      </span>
                      <Play className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
