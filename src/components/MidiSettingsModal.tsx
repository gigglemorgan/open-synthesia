/**
 * MidiSettingsModal.tsx
 * MIDI Cihaz & Sustain Pedalı Ayar & Test Paneli
 */

import React, { useState, useEffect } from 'react';
import { X, Cpu, CheckCircle2, Keyboard, Disc } from 'lucide-react';
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
      <div className="w-full max-w-lg bg-[#141722] border border-[#262c42] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262c42] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">MIDI Klavye & Pedal Ayarları</h2>
              <p className="text-xs text-gray-400">Web MIDI API donanım bağlantısı</p>
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
        <div className="p-6 space-y-6">
          {/* Cihaz Seçimi */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Bağlı MIDI Cihazları
            </label>

            {devices.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#1b2030] border border-[#272e45] text-center space-y-2">
                <p className="text-sm text-gray-300 font-medium">Bağlı MIDI klavye algılanmadı.</p>
                <p className="text-xs text-gray-500">
                  USB veya Bluetooth MIDI klavyenizi bağlayın. (Tarayıcı izin istediğinde 'İzin Ver' seçiniz).
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs">
                    Bilgisayar klavyesiyle çalmaya devam edebilirsiniz!
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => {
                  const isSelected = activeDevice?.id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => onSelectDevice(d.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md'
                          : 'bg-[#181b28] border-[#252a3d] hover:bg-[#1f2334]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Disc className={`w-5 h-5 ${isSelected ? 'text-emerald-400 animate-spin' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="text-sm font-bold text-white">{d.name}</h4>
                          <p className="text-xs text-gray-400">{d.manufacturer}</p>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sustain Pedal & Tuş Canlı Testi */}
          <div className="p-4 rounded-xl bg-[#181b28] border border-[#252a3d] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Canlı Donanım Giriş Testi
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Sustain Pedal Durumu */}
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                sustainPedalActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_#f59e0b]'
                  : 'bg-[#131520] border-[#24293c] text-gray-400'
              }`}>
                <span className="text-xs font-medium">Sustain Pedalı (CC 64)</span>
                <span className="text-base font-extrabold mt-1">
                  {sustainPedalActive ? 'BASILI (AKTİF)' : 'Bırakıldı'}
                </span>
              </div>

              {/* Son Basılan Nota */}
              <div className="p-3 rounded-xl bg-[#131520] border border-[#24293c] flex flex-col items-center justify-center text-gray-300">
                <span className="text-xs font-medium text-gray-400">Son Basılan Nota</span>
                <span className="text-base font-extrabold text-indigo-400 mt-1">
                  {lastTestedNote !== null ? `MIDI ${lastTestedNote}` : 'Bekleniyor...'}
                </span>
              </div>
            </div>
          </div>

          {/* Klavye Kısayolları Bilgisi */}
          <div className="p-4 rounded-xl bg-[#11131c] border border-[#23283b] space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-gray-300">
              <Keyboard className="w-4 h-4 text-indigo-400" />
              <span>Bilgisayar Klavyesi Eşlemesi:</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-200">Beyaz Tuşlar:</strong> Q, W, E, R, T, Y, U, I, O, P (ve alt oktav için Z, X, C, V...)<br />
              <strong className="text-gray-200">Siyah Tuşlar:</strong> 2, 3, 5, 6, 7...<br />
              <strong className="text-amber-400">Sustain Pedalı:</strong> Boşluk (Spacebar) tuşuna basılı tutarak uzatabilirsiniz!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
