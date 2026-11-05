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
  CheckCircle, 
  Loader2, 
  Sparkles,
  UploadCloud
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
      <div className="w-full max-w-2xl bg-[#141722] border border-[#262c42] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Başlığı */}
        <div className="px-6 py-4 border-b border-[#262c42] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Format Dönüştürücü</h2>
              <p className="text-xs text-gray-400">MIDI dosyasından MP3 üretin veya Ses kaydından MIDI çıkarın</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1e2334] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tablar */}
        <div className="flex border-b border-[#262c42] bg-[#0e1017]">
          <button
            onClick={() => setActiveTab('midiToMp3')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'midiToMp3'
                ? 'border-indigo-500 text-indigo-400 bg-[#161a27]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>.MID ➔ .MP3 (Gerçek Piyano)</span>
          </button>

          <button
            onClick={() => setActiveTab('mp3ToMidi')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'mp3ToMidi'
                ? 'border-emerald-500 text-emerald-400 bg-[#161a27]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>.MP3 / Ses ➔ .MID (Nota Çıkarma)</span>
          </button>
        </div>

        {/* İçerik */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: MIDI -> MP3 */}
          {activeTab === 'midiToMp3' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#1b2030] border border-[#2a314b] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Seçili Parça
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">
                    {currentSong.metadata.title}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    {currentSong.notes.length} nota • {Math.round(currentSong.metadata.duration)} saniye
                  </p>
                </div>

                <button
                  disabled={isRenderingMp3}
                  onClick={() => handleConvertMidiToMp3()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all"
                >
                  {isRenderingMp3 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Render Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>MP3'e Çevir</span>
                    </>
                  )}
                </button>
              </div>

              {/* Veya Bilgisayardan Başka Bir MIDI Yükle */}
              <div className="p-4 rounded-xl border border-dashed border-[#2f3754] text-center hover:border-indigo-500/50 transition-colors">
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
                <label
                  htmlFor="midi-upload-convert"
                  className="cursor-pointer flex flex-col items-center space-y-1.5"
                >
                  <UploadCloud className="w-6 h-6 text-indigo-400" />
                  <span className="text-sm font-medium text-gray-300">
                    Farklı bir .mid dosyası seçerek doğrudan MP3 yap
                  </span>
                  <span className="text-xs text-gray-500">Tıklayın veya dosyayı sürükleyin</span>
                </label>
              </div>

              {/* İlerleme Çubuğu */}
              {isRenderingMp3 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{mp3StatusText}</span>
                    <span className="font-bold text-indigo-400">%{mp3Progress}</span>
                  </div>
                  <div className="w-full h-2 bg-[#23283b] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                      style={{ width: `${mp3Progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Çıktı / İndir / Dinle */}
              {generatedMp3Url && generatedMp3Blob && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>MP3 Başarıyla Üretildi!</span>
                  </div>

                  <audio src={generatedMp3Url} controls className="w-full h-10 rounded-lg outline-none" />

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => MidiToMp3Converter.downloadMp3(generatedMp3Blob, `${currentSong.metadata.title}.mp3`)}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>MP3 İndir (.mp3)</span>
                    </button>

                    <button
                      onClick={() => onOpenAudioInPlayer(generatedMp3Url, currentSong.metadata.title)}
                      className="py-2 px-3 rounded-lg bg-[#22283a] hover:bg-[#2b334a] text-gray-200 font-medium text-xs flex items-center space-x-1.5 transition-all border border-[#37415e]"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Çalarda Dinle</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MP3 -> MIDI */}
          {activeTab === 'mp3ToMidi' && (
            <div className="space-y-5">
              <div className="p-6 rounded-xl border border-dashed border-[#2f3754] text-center hover:border-emerald-500/50 transition-colors">
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
                <label
                  htmlFor="audio-upload-convert"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <FileAudio className="w-8 h-8 text-emerald-400" />
                  <span className="text-sm font-semibold text-gray-200">
                    {audioFile ? audioFile.name : 'MP3 veya WAV Ses Dosyası Seçin'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Şarkıdaki piyano notaları taranıp .mid dosyasına dönüştürülür
                  </span>
                </label>
              </div>

              {audioFile && (
                <button
                  disabled={isTranscribing}
                  onClick={handleConvertAudioToMidi}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ses Analiz Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Notaları Çıkar ve MIDI Oluştur</span>
                    </>
                  )}
                </button>
              )}

              {/* İlerleme */}
              {isTranscribing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{transcribeStatus}</span>
                    <span className="font-bold text-emerald-400">%{transcribeProgress}</span>
                  </div>
                  <div className="w-full h-2 bg-[#23283b] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                      style={{ width: `${transcribeProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sonuç & Stüdyoya Yükleme */}
              {transcribedSong && transcribedMidiBytes && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>Dönüştürme Başarılı! {transcribedSong.notes.length} Nota Tespit Edildi</span>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => {
                        onLoadSongIntoStudio(transcribedSong);
                        onClose();
                      }}
                      className="flex-1 py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Stüdyoda Aç ve Etüde Başla!</span>
                    </button>

                    <button
                      onClick={() => MidiWriter.downloadMidi(transcribedMidiBytes, `${transcribedSong.metadata.title}.mid`)}
                      className="py-2.5 px-4 rounded-lg bg-[#22283a] hover:bg-[#2b334a] text-gray-200 font-medium text-xs flex items-center space-x-1.5 transition-all border border-[#37415e]"
                    >
                      <Download className="w-4 h-4" />
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
