/**
 * MidiSettingsModal.tsx
 * MIDI Cihaz & Sustain Pedalı Ayar & Test Paneli
 */

import React, { useState, useEffect } from 'react';
import { X, Cpu, CheckCircle2, Keyboard, Disc3 } from 'lucide-react';
import { MidiDevice } from '../types';
import { midiManager } from '../midi/MidiManager';

interface MidiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: MidiDevice[];
  activeDevice: MidiDevice | null;
  onSelectDevice: (id: string) => void;
  sustainPedalActive: boolean;
}

export const MidiSettingsModal: React.FC<MidiSettingsModalProps> = ({
  isOpen,
  onClose,
  devices,
  activeDevice,
  onSelectDevice,
  sustainPedalActive,
}) => {
  const [lastTestedNote, setLastTestedNote] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubNote = midiManager.onNoteOn((midi) => {
      setLastTestedNote(midi);
    });

    return () => {
      unsubNote();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111218] border border-[#232738] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#202436] flex items-center justify-between bg-[#0d0e14]">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider">
              MIDI Aygıtı & Pedal Yönetimi
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
        <div className="p-5 space-y-4">
          {/* Cihaz Seçimi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Kullanılabilir Girişler
            </label>

            {devices.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#0e1017] border border-[#202436] text-center space-y-1.5">
                <p className="text-xs text-zinc-300 font-medium">Bağlı donanım algılanmadı.</p>
                <p className="text-[11px] text-zinc-500">
                  USB veya Bluetooth MIDI klavyenizi bağlayıp sayfayı yenileyebilirsiniz.
                </p>
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-0.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded text-[11px] font-mono">
                    Bilgisayar klavyesiyle çalmaya hazır
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {devices.map((d) => {
                  const isSelected = activeDevice?.id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => onSelectDevice(d.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                          : 'bg-[#0e1017] border-[#202436] hover:bg-[#161822]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Disc3 className={`w-4 h-4 ${isSelected ? 'text-emerald-400 animate-spin' : 'text-zinc-500'}`} />
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-100">{d.name}</h4>
                          <p className="text-[10px] font-mono text-zinc-500">{d.manufacturer}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pedal & Tuş Canlı Testi */}
          <div className="p-3.5 rounded-lg bg-[#0e1017] border border-[#202436] space-y-2">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Canlı Sinyal Monitörü
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Sustain Pedal Durumu */}
              <div className={`p-2.5 rounded border flex flex-col items-center justify-center font-mono transition-all ${
                sustainPedalActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_#f59e0b]'
                  : 'bg-[#090a0f] border-[#1d2030] text-zinc-500'
              }`}>
                <span className="text-[10px]">PEDAL (CC 64)</span>
                <span className="text-xs font-bold mt-0.5">
                  {sustainPedalActive ? 'DOWN (ON)' : 'UP (OFF)'}
                </span>
              </div>

              {/* Son Basılan Nota */}
              <div className="p-2.5 rounded bg-[#090a0f] border border-[#1d2030] flex flex-col items-center justify-center font-mono text-zinc-300">
                <span className="text-[10px] text-zinc-500">SON NOTA</span>
                <span className="text-xs font-bold text-indigo-400 mt-0.5">
                  {lastTestedNote !== null ? `MIDI ${lastTestedNote}` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Klavye Kısayolları */}
          <div className="p-3 rounded-lg bg-[#0a0b10] border border-[#1d2030] space-y-1.5 font-mono text-[11px] text-zinc-400">
            <div className="flex items-center space-x-1.5 text-zinc-300 font-semibold">
              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
              <span>Klavye Tuşları:</span>
            </div>
            <p className="leading-relaxed">
              <strong className="text-zinc-200">Beyaz Tuşlar:</strong> Q, W, E, R, T, Y, U, I, O, P (Z, X, C, V...)<br />
              <strong className="text-zinc-200">Siyah Tuşlar:</strong> 2, 3, 5, 6, 7...<br />
              <strong className="text-amber-400">Sustain Pedalı:</strong> Boşluk (Spacebar) tuşuna basılı tutun
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
