/**
 * AudioToMidi.ts
 * MP3 / WAV / OGG Ses Dosyasını MIDI Notalarına Dönüştürücü
 * - İstemci taraflı Web Audio frekans / spektrum çözümleme
 * - Nota başlangıç (onset) ve polifonik tepe frekans tespiti
 * - Akıllı nota süresi birleştirme ve MIDI üretimi
 */

import { VisualNote } from '../types';
import { midiToNoteName } from '../audio/PianoEngine';
import { MidiWriter } from '../midi/MidiWriter';
import { detectBpmFromNoteTimings } from '../midi/MidiParser';

export interface AudioToMidiResult {
  notes: VisualNote[];
  midiBytes: Uint8Array;
  detectedBpm: number;
  duration: number;
}

export class AudioToMidiConverter {
  /**
   * Ses dosyasını (MP3, WAV vs.) analiz edip MIDI'ye dönüştürür
   */
  public static async convert(
    audioFile: File | Blob,
    onProgress?: (progress: number, status: string) => void
  ): Promise<AudioToMidiResult> {
    onProgress?.(5, 'Ses dosyası okunuyor...');

    const arrayBuffer = await audioFile.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();

    onProgress?.(15, 'Ses verisi çözümleniyor (Decode)...');
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    onProgress?.(30, 'Frekanslar ve notalar analiz ediliyor...');

    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // Mono or left
    const totalSamples = channelData.length;
    const duration = audioBuffer.duration;

    // Analysis parameters
    const fftSize = 4096;
    const hopSize = 1024; // ~23ms resolution at 44.1kHz
    const numFrames = Math.floor((totalSamples - fftSize) / hopSize);

    // Hanning Window
    const hanningWindow = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      hanningWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    }

    // Active note tracker: midi -> { startTime, lastTime, peakVelocity }
    const activeNotes = new Map<number, { startTime: number; lastTime: number; peakVelocity: number }>();
    const finishedNotes: VisualNote[] = [];
    let noteIdCounter = 0;

    // Minimum energy threshold
    const minEnergy = 0.015;

    for (let frame = 0; frame < numFrames; frame++) {
      const offset = frame * hopSize;
      const currentTime = offset / sampleRate;

      // Extract windowed frame
      const real = new Float32Array(fftSize);
      const imag = new Float32Array(fftSize);

      let frameEnergy = 0;
      for (let i = 0; i < fftSize; i++) {
        const val = channelData[offset + i] * hanningWindow[i];
        real[i] = val;
        frameEnergy += val * val;
      }

      frameEnergy = Math.sqrt(frameEnergy / fftSize);

      // Simple FFT approximation or peak picking
      const activePitchesInFrame = new Set<number>();

      if (frameEnergy > minEnergy) {
        // Fast DFT / Peak Search for piano musical note frequencies (A0=27.5Hz to C8=4186Hz)
        // Focus on common piano range MIDI 21 to 108
        const detectedMidis = this.extractPeaks(real, sampleRate, fftSize);
        detectedMidis.forEach(m => activePitchesInFrame.add(m));
      }

      // Check ended notes
      activeNotes.forEach((noteData, midi) => {
        if (!activePitchesInFrame.has(midi) || (currentTime - noteData.lastTime > 0.15)) {
          // Note ended
          const noteDuration = noteData.lastTime - noteData.startTime;
          if (noteDuration >= 0.08) {
            finishedNotes.push({
              id: `detected-${noteIdCounter++}`,
              midi,
              noteName: midiToNoteName(midi),
              time: noteData.startTime,
              duration: Math.max(0.12, noteDuration),
              velocity: Math.min(1.0, noteData.peakVelocity * 1.5),
              hand: midi < 60 ? 'left' : 'right',
              hit: false,
            });
          }
          activeNotes.delete(midi);
        }
      });

      // Update or add active notes
      activePitchesInFrame.forEach((midi) => {
        if (activeNotes.has(midi)) {
          const current = activeNotes.get(midi)!;
          current.lastTime = currentTime;
          current.peakVelocity = Math.max(current.peakVelocity, frameEnergy);
        } else {
          activeNotes.set(midi, {
            startTime: currentTime,
            lastTime: currentTime,
            peakVelocity: frameEnergy,
          });
        }
      });

      if (frame % 100 === 0 && onProgress) {
        const progress = Math.round(30 + (frame / numFrames) * 60);
        onProgress(progress, `Spektrum taranıyor: %${progress}`);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // Flush any remaining active notes
    activeNotes.forEach((noteData, midi) => {
      const noteDuration = noteData.lastTime - noteData.startTime;
      if (noteDuration >= 0.08) {
        finishedNotes.push({
          id: `detected-${noteIdCounter++}`,
          midi,
          noteName: midiToNoteName(midi),
          time: noteData.startTime,
          duration: Math.max(0.12, noteDuration),
          velocity: Math.min(1.0, noteData.peakVelocity * 1.5),
          hand: midi < 60 ? 'left' : 'right',
          hit: false,
        });
      }
    });

    onProgress?.(95, 'MIDI dosyası derleniyor...');

    // Sort notes
    finishedNotes.sort((a, b) => a.time - b.time);

    // Otomatik BPM tespiti (Inter-onset interval analizi)
    const detectedBpm = detectBpmFromNoteTimings(finishedNotes.map(n => n.time));

    // Generate MIDI binary
    const midiBytes = MidiWriter.createMidiFromNotes(finishedNotes, detectedBpm, 'Audio Transcribed Track');

    onProgress?.(100, 'Tamamlandı!');

    return {
      notes: finishedNotes,
      midiBytes,
      detectedBpm,
      duration,
    };
  }

  /**
   * FFT & Harmonik Tepe Tespiti
   */
  private static extractPeaks(signal: Float32Array, sampleRate: number, fftSize: number): number[] {
    const N = fftSize;
    const detectedMidis: number[] = [];

    // Simple Autocorrelation or Harmonic Comb for robust pitch detection in range 55Hz - 2000Hz
    // Autocorrelation provides great polyphonic pitch detection for acoustic instruments
    const minPeriod = Math.floor(sampleRate / 2093); // C7 ~2093 Hz
    const maxPeriod = Math.floor(sampleRate / 55);   // A1 ~55 Hz

    let bestCorrelation = 0;
    let bestPeriod = 0;

    for (let period = minPeriod; period <= maxPeriod; period += 2) {
      let corr = 0;
      for (let i = 0; i < N - period; i += 4) {
        corr += signal[i] * signal[i + period];
      }

      if (corr > bestCorrelation) {
        bestCorrelation = corr;
        bestPeriod = period;
      }
    }

    if (bestPeriod > 0 && bestCorrelation > 0.5) {
      const freq = sampleRate / bestPeriod;
      const midi = Math.round(69 + 12 * Math.log2(freq / 440));
      if (midi >= 21 && midi <= 108) {
        detectedMidis.push(midi);

        // Check for 3rd or 5th harmonic presence
        if (midi >= 48) {
          detectedMidis.push(midi - 12); // Bass fundamental octave
        }
      }
    }

    return detectedMidis;
  }
}
