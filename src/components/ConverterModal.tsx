/**
 * ConverterModal.tsx
 * İki Yönlü Dönüştürücü: MIDI ⇄ MP3
 * - .mid -> .mp3: Gerçekçi Akustik Piyano ile Yüksek Kalite LAME MP3 render
 * - .mp3 -> .mid: Spektral Nota Çözümleme ile Standart MIDI üretimi
 */

import React, { useState } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  FileAudio, 
  Music, 
  Download, 
  Play, 
  CheckCircle2, 
  Loader2, 
  UploadCloud,
  FileCode2
} from 'lucide-react';
import { VisualNote, LoadedSong } from '../types';
import { MidiToMp3Converter } from '../converter/MidiToMp3';
import { AudioToMidiConverter } from '../converter/AudioToMidi';
import { MidiParser } from '../midi/MidiParser';
import { MidiWriter } from '../midi/MidiWriter';

interface ConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: LoadedSong;
  onLoadSongIntoStudio: (song: LoadedSong) => void;
  onOpenAudioInPlayer: (url: string, title: string) => void;
}

export const ConverterModal: React.FC<ConverterModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  onLoadSongIntoStudio,
  onOpenAudioInPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'midiToMp3' | 'mp3ToMidi'>('midiToMp3');

  // MIDI -> MP3 State
  const [isRenderingMp3, setIsRenderingMp3] = useState(false);
  const [mp3Progress, setMp3Progress] = useState(0);
  const [mp3StatusText, setMp3StatusText] = useState('');
  const [generatedMp3Url, setGeneratedMp3Url] = useState<string | null>(null);
  const [generatedMp3Blob, setGeneratedMp3Blob] = useState<Blob | null>(null);

  // MP3 -> MIDI State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const [transcribedSong, setTranscribedSong] = useState<LoadedSong | null>(null);
  const [transcribedMidiBytes, setTranscribedMidiBytes] = useState<Uint8Array | null>(null);

  if (!isOpen) return null;

  // Handle MIDI -> MP3 Conversion
  const handleConvertMidiToMp3 = async (useUploadedFile?: File) => {
    try {
      setIsRenderingMp3(true);
      setMp3Progress(5);
      setMp3StatusText('Akustik piyano sesleri hazırlanıyor...');

      let notesToRender: VisualNote[] = currentSong.notes;
      let duration = currentSong.metadata.duration;

      if (useUploadedFile) {
        const buffer = await useUploadedFile.arrayBuffer();
        const parsed = MidiParser.parse(buffer, useUploadedFile.name);
        notesToRender = parsed.notes;
        duration = parsed.metadata.duration;
      }

      setMp3StatusText('Offline Audio Context ile stüdyo kalitesinde piyano kaydediliyor...');

      const result = await MidiToMp3Converter.convert(
        notesToRender,
        duration,
        (stage, pct) => {
          if (stage === 'rendering') {
            setMp3Progress(Math.round(pct * 0.6));
            setMp3StatusText(`Piyano rezonansı render ediliyor: %${pct}`);
          } else {
            setMp3Progress(Math.round(60 + pct * 0.4));
            setMp3StatusText(`LAME MP3 formatına kodlanıyor: %${pct}`);
          }
        }
      );

      setGeneratedMp3Url(result.mp3Url);
      setGeneratedMp3Blob(result.mp3Blob);
      setMp3StatusText('MP3 başarıyla oluşturuldu!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Dönüştürme sırasında bir hata oluştu.';
      alert(msg);
    } finally {
      setIsRenderingMp3(false);
    }
  };

  // Handle MP3 -> MIDI Transcription
  const handleConvertAudioToMidi = async () => {
    if (!audioFile) return;

    try {
      setIsTranscribing(true);
      setTranscribeProgress(0);

      const result = await AudioToMidiConverter.convert(audioFile, (pct, status) => {
        setTranscribeProgress(pct);
        setTranscribeStatus(status);
      });

      const parsed: LoadedSong = {
        metadata: {
          title: audioFile.name.replace(/\.[^/.]+$/, "") + " (Dönüştürüldü)",
          artist: "Audio to MIDI",
          bpm: result.detectedBpm,
          duration: result.duration,
          totalNotes: result.notes.length,
          tracksCount: 2,
        },
        notes: result.notes,
        rawMidiData: result.midiBytes,
      };

      setTranscribedSong(parsed);
      setTranscribedMidiBytes(result.midiBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ses analizi sırasında bir hata oluştu.';
      alert(msg);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#111218] border border-[#232738] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Başlığı */}
        <div className="px-5 py-3.5 border-b border-[#202436] flex items-center justify-between bg-[#0d0e14]">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider">
              Format Dönüştürücü (.mid ⇄ .mp3)
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#1a1d2c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tablar */}
        <div className="flex border-b border-[#202436] bg-[#0c0d12]">
          <button
            onClick={() => setActiveTab('midiToMp3')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'midiToMp3'
                ? 'border-indigo-500 text-indigo-400 bg-[#141622]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>.MID ➔ .MP3</span>
          </button>

          <button
            onClick={() => setActiveTab('mp3ToMidi')}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'mp3ToMidi'
                ? 'border-emerald-500 text-emerald-400 bg-[#141622]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>SES ➔ .MID</span>
          </button>
        </div>

        {/* İçerik */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TAB 1: MIDI -> MP3 */}
          {activeTab === 'midiToMp3' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#0e1017] border border-[#202436] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-indigo-400">Aktif Parça</span>
                  <h4 className="text-sm font-semibold text-zinc-100 mt-0.5">{currentSong.metadata.title}</h4>
                  <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    {currentSong.notes.length} nota • {Math.round(currentSong.metadata.duration)}s
                  </p>
                </div>

                <button
                  disabled={isRenderingMp3}
                  onClick={() => handleConvertMidiToMp3()}
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  {isRenderingMp3 ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-3.5 h-3.5" />
                      <span>MP3'e Render Et</span>
                    </>
                  )}
                </button>
              </div>

              {/* Farklı bir MIDI Yükle */}
              <div className="p-4 rounded-lg border border-dashed border-[#262a3d] text-center hover:border-indigo-500/50 transition-colors">
                <input
                  type="file"
                  accept=".mid,.midi"
                  id="midi-upload-convert"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleConvertMidiToMp3(file);
                  }}
                />
                <label htmlFor="midi-upload-convert" className="cursor-pointer flex flex-col items-center space-y-1">
                  <UploadCloud className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-medium text-zinc-300">Harici bir .mid dosyası seçerek dönüştür</span>
                  <span className="text-[10px] text-zinc-500">Tıklayın veya sürükleyin</span>
                </label>
              </div>

              {/* Progress */}
              {isRenderingMp3 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>{mp3StatusText}</span>
                    <span className="font-bold text-indigo-400">%{mp3Progress}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1b1e2c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-200"
                      style={{ width: `${mp3Progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sonuç */}
              {generatedMp3Url && generatedMp3Blob && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>MP3 Hazır (192kbps LAME)</span>
                  </div>

                  <audio src={generatedMp3Url} controls className="w-full h-8 rounded outline-none" />

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => MidiToMp3Converter.downloadMp3(generatedMp3Blob, `${currentSong.metadata.title}.mp3`)}
                      className="flex-1 py-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>MP3 İndir</span>
                    </button>

                    <button
                      onClick={() => onOpenAudioInPlayer(generatedMp3Url, currentSong.metadata.title)}
                      className="py-1.5 px-3 rounded bg-[#1e2230] hover:bg-[#282d40] text-zinc-200 font-medium text-xs flex items-center space-x-1.5 transition-all border border-[#2f354c]"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Çalarda Aç</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MP3 -> MIDI */}
          {activeTab === 'mp3ToMidi' && (
            <div className="space-y-4">
              <div className="p-5 rounded-lg border border-dashed border-[#262a3d] text-center hover:border-emerald-500/50 transition-colors">
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,.mp3,.wav,.ogg"
                  id="audio-upload-convert"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFile(file);
                  }}
                />
                <label htmlFor="audio-upload-convert" className="cursor-pointer flex flex-col items-center space-y-1.5">
                  <FileCode2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    {audioFile ? audioFile.name : 'MP3 / WAV / OGG Ses Dosyası Seçin'}
                  </span>
                  <span className="text-[10px] text-zinc-500">Piyano spektrum analizi ve nota tespiti</span>
                </label>
              </div>

              {audioFile && (
                <button
                  disabled={isTranscribing}
                  onClick={handleConvertAudioToMidi}
                  className="w-full py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Spektrum Analizi Yapılıyor...</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-3.5 h-3.5" />
                      <span>Notaları Çıkar ve MIDI Üret</span>
                    </>
                  )}
                </button>
              )}

              {isTranscribing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                    <span>{transcribeStatus}</span>
                    <span className="font-bold text-emerald-400">%{transcribeProgress}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1b1e2c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${transcribeProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {transcribedSong && transcribedMidiBytes && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-mono text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dönüştürme Tamamlandı ({transcribedSong.notes.length} Nota, {transcribedSong.metadata.bpm} BPM)</span>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => {
                        onLoadSongIntoStudio(transcribedSong);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <span>Stüdyoda Aç ve Çal</span>
                    </button>

                    <button
                      onClick={() => MidiWriter.downloadMidi(transcribedMidiBytes, `${transcribedSong.metadata.title}.mid`)}
                      className="py-1.5 px-3 rounded bg-[#1e2230] hover:bg-[#282d40] text-zinc-200 font-medium text-xs flex items-center space-x-1 border border-[#2f354c]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>.MID İndir</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
