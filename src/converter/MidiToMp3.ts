/**
 * MidiToMp3.ts
 * MIDI Notalarını Gerçek Akustik Piyano ile MP3'e Dönüştürme Servisi
 */

import { pianoEngine } from '../audio/PianoEngine';
import { VisualNote } from '../types';
import { audioBufferToMp3 } from './mp3Encoder';

export interface MidiToMp3Result {
  mp3Blob: Blob;
  mp3Url: string;
  duration: number;
}

export class MidiToMp3Converter {
  public static async convert(
    notes: VisualNote[],
    totalDuration: number,
    onProgress?: (stage: 'rendering' | 'encoding', percent: number) => void
  ): Promise<MidiToMp3Result> {
    if (notes.length === 0) {
      throw new Error('Dönüştürülecek nota bulunamadı.');
    }

    onProgress?.('rendering', 10);

    // 1. Ses motoru ile yüksek kaliteli AudioBuffer render et
    const audioBuffer = await pianoEngine.renderNotesToAudioBuffer(
      notes.map(n => ({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity,
      })),
      totalDuration
    );

    onProgress?.('rendering', 100);
    onProgress?.('encoding', 0);

    // 2. AudioBuffer'ı LAME MP3'e dönüştür
    const mp3Blob = await audioBufferToMp3(audioBuffer, 192, (pct) => {
      onProgress?.('encoding', pct);
    });

    const mp3Url = URL.createObjectURL(mp3Blob);

    return {
      mp3Blob,
      mp3Url,
      duration: audioBuffer.duration,
    };
  }

  public static downloadMp3(blob: Blob, filename: string = 'piano-track.mp3'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mp3') ? filename : `${filename}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
