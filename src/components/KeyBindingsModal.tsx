/**
 * KeyBindingsModal.tsx
 * Klavye Tuş Atamaları & Oktav Kaydırma Paneli
 */

import React, { useState, useEffect } from 'react';
import { X, Keyboard, RotateCcw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { midiManager, DEFAULT_KEYBOARD_MAP } from '../midi/MidiManager';
import { midiToNoteName } from '../audio/PianoEngine';

interface KeyBindingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showKeyBindings: boolean;
  onToggleShowKeyBindings: (show: boolean) => void;
}

export const KeyBindingsModal: React.FC<KeyBindingsModalProps> = ({
  isOpen,
  onClose,
  showKeyBindings,
  onToggleShowKeyBindings,
}) => {
  const [octaveOffset, setOctaveOffset] = useState<number>(midiManager.getOctaveOffset());
  const [keyMap, setKeyMap] = useState<Record<string, number>>(midiManager.getKeyMap());
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = midiManager.onConfigChange((offset, map) => {
      setOctaveOffset(offset);
      setKeyMap({ ...map });
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOctaveChange = (delta: number) => {
    midiManager.shiftOctave(delta);
    setOctaveOffset(midiManager.getOctaveOffset());
  };

  const handleResetDefaults = () => {
    midiManager.setKeyMap(DEFAULT_KEYBOARD_MAP);
    midiManager.setOctaveOffset(0);
    setOctaveOffset(0);
    setKeyMap({ ...DEFAULT_KEYBOARD_MAP });
  };

  // Group keys into White and Black keys for clean display
  const keyEntries = Object.entries(keyMap).map(([key, baseMidi]) => {
    const actualMidi = baseMidi + (octaveOffset * 12);
    return {
      key: key.toUpperCase(),
      rawKey: key,
      baseMidi,
      actualMidi,
      noteName: midiToNoteName(actualMidi),
      isBlack: [1, 3, 6, 8, 10].includes(actualMidi % 12),
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#10121a] border border-[#232738] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1e2232] flex items-center justify-between bg-[#0b0d13]">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider">
              Klavye Tuş Atamaları & Kontroller
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#1a1d2c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Oktav Kaydırma Barı */}
          <div className="p-3 bg-[#0a0b10] border border-[#1d2030] rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-200">Oktav Kaydırma</span>
              <p className="text-[10px] text-zinc-500 font-mono">
                Klavyeden <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">[</kbd> ve <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">]</kbd> tuşlarıyla da değiştirebilirsiniz
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleOctaveChange(-1)}
                disabled={octaveOffset <= -2}
                className="p-1.5 rounded bg-[#181a26] hover:bg-[#222538] disabled:opacity-30 text-zinc-300 border border-[#2b3046] transition-colors"
                title="Oktav Aşağı (-1)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 rounded bg-indigo-600/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                {octaveOffset === 0 ? 'Normal (0)' : octaveOffset > 0 ? `+${octaveOffset} Oktav` : `${octaveOffset} Oktav`}
              </span>

              <button
                onClick={() => handleOctaveChange(1)}
                disabled={octaveOffset >= 2}
                className="p-1.5 rounded bg-[#181a26] hover:bg-[#222538] disabled:opacity-30 text-zinc-300 border border-[#2b3046] transition-colors"
                title="Oktav Yukarı (+1)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tuş İpuçlarını Tuşlar Üzerinde Göster Switch */}
          <div className="flex items-center justify-between p-3 bg-[#0a0b10] border border-[#1d2030] rounded-lg">
            <div>
              <span className="text-xs font-semibold text-zinc-200">Piyano Tuşlarında Harfleri Göster</span>
              <p className="text-[10px] text-zinc-500 font-mono">Tuşların üzerine Q, W, E... harf rozetlerini yerleştirir</p>
            </div>

            <button
              onClick={() => onToggleShowKeyBindings(!showKeyBindings)}
              className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                showKeyBindings ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                  showKeyBindings ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Tuş Atamaları Izgarası */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Tuş - Nota Eşleşmesi
              </span>
              <button
                onClick={handleResetDefaults}
                className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Varsayılanlara Sıfırla</span>
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {keyEntries.map((item) => (
                <div
                  key={item.key}
                  className={`p-2 rounded-md border flex flex-col items-center justify-center transition-all ${
                    item.isBlack
                      ? 'bg-[#151722] border-[#292f44] text-amber-300'
                      : 'bg-[#0c0d14] border-[#1d2030] text-zinc-200'
                  }`}
                >
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[11px] font-mono font-bold text-white shadow-xs border border-zinc-700">
                    {item.key}
                  </kbd>
                  <span className="text-[10px] font-mono mt-1 font-semibold">
                    {item.noteName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Özel Tuş Bilgisi */}
          <div className="p-3 bg-[#0a0b10] border border-[#1d2030] rounded-lg text-[11px] font-mono text-zinc-400 space-y-1">
            <p><strong className="text-amber-400">Boşluk (Spacebar):</strong> Sustain Pedalı (sesi uzatır)</p>
            <p><strong className="text-indigo-400">[ / ]:</strong> Oktavı anında aşağı / yukarı kaydırır</p>
          </div>
        </div>
      </div>
    </div>
  );
};
