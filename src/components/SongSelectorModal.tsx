/**
 * SongSelectorModal.tsx
 * Eser Seçici & Özel .MID Dosyası Yükleyici
 */

import React from 'react';
import { X, Music, UploadCloud, Clock, Hash, Play } from 'lucide-react';
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
      <div className="w-full max-w-xl bg-[#141722] border border-[#262c42] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262c42] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Eser Kütüphanesi</h2>
              <p className="text-xs text-gray-400">Klasik etüdler veya kendi MIDI dosyanız</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e2334] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Sürükle Bırak / Özel MIDI Yükle */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-5 rounded-xl border border-dashed border-[#2f3754] text-center hover:border-indigo-500 transition-colors bg-[#11131c]"
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
              className="cursor-pointer flex flex-col items-center space-y-1.5"
            >
              <UploadCloud className="w-7 h-7 text-indigo-400" />
              <span className="text-sm font-semibold text-gray-200">
                Kendi .mid veya .midi Dosyanızı Yükleyin
              </span>
              <span className="text-xs text-gray-500">
                Bilgisayarınızdan sürükleyip bırakabilir veya seçebilirsiniz
              </span>
            </label>
          </div>

          {/* Hazır Klasik Eserler */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
              Hazır Etüd & Klasik Eserler
            </span>

            <div className="space-y-2">
              {SAMPLE_SONGS.map((song, idx) => {
                const isSelected = song.metadata.title === currentTitle;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md'
                        : 'bg-[#181b28] border-[#252a3d] hover:bg-[#1f2334] hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-[#252a3d] text-gray-300 group-hover:text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-100 group-hover:text-indigo-300 transition-colors">
                          {song.metadata.title}
                        </h4>
                        <p className="text-xs text-gray-400">{song.metadata.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Hash className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{song.notes.length} nota</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{Math.round(song.metadata.duration)}s</span>
                      </span>
                      <Play className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
