/**
 * MidiParser.ts
 * MIDI Dosyası Çözümleyici, Akıllı El Ayrımı & Otomatik BPM Tespiti
 */

import { Midi } from '@tonejs/midi';
import { VisualNote, LoadedSong } from '../types';
import { midiToNoteName } from '../audio/PianoEngine';

export function detectBpmFromNoteTimings(times: number[]): number {
  if (times.length < 4) return 120;

  const sorted = [...times].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const dt = sorted[i] - sorted[i - 1];
    if (dt > 0.07 && dt < 2.2) {
      intervals.push(dt);
    }
  }

  if (intervals.length === 0) return 120;

  let bestBpm = 120;
  let maxScore = -1;

  for (let bpm = 50; bpm <= 200; bpm += 2) {
    const beatInterval = 60 / bpm;
    let score = 0;

    for (const dt of intervals) {
      for (const mult of [0.25, 0.5, 0.75, 1.0, 1.5, 2.0]) {
        const target = beatInterval * mult;
        const diff = Math.abs(dt - target);
        if (diff < 0.035) {
          score += 1 - diff / 0.035;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}

export class MidiParser {
  /**
   * ArrayBuffer / Uint8Array formatındaki .mid dosyasını çözümler
   */
  public static parse(data: ArrayBuffer | Uint8Array, filename: string = 'Untitled'): LoadedSong {
    const midi = new Midi(data);
    const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const notes: VisualNote[] = [];
    const duration = midi.duration || 10;
    const title = midi.name || filename.replace(/\.[^/.]+$/, "") || 'İsimsiz Eser';

    const trackCount = midi.tracks.length;
    let noteIdCounter = 0;

    const activeTracks = midi.tracks.filter(t => t.notes.length > 0);
    const isSeparatedTracks = activeTracks.length >= 2;

    midi.tracks.forEach((track, trackIndex) => {
      let avgPitch = 60;
      if (track.notes.length > 0) {
        avgPitch = track.notes.reduce((sum, n) => sum + n.midi, 0) / track.notes.length;
      }

      track.notes.forEach((note) => {
        let hand: 'left' | 'right' = 'right';

        if (isSeparatedTracks) {
          if (avgPitch < 58) {
            hand = 'left';
          } else if (avgPitch > 62) {
            hand = 'right';
          } else {
            hand = note.midi < 60 ? 'left' : 'right';
          }
        } else {
          hand = note.midi < 60 ? 'left' : 'right';
        }

        notes.push({
          id: `note-${noteIdCounter++}`,
          midi: note.midi,
          noteName: midiToNoteName(note.midi),
          time: note.time,
          duration: Math.max(0.1, note.duration),
          velocity: note.velocity || 0.8,
          hand,
          trackIndex,
          hit: false,
        });
      });
    });

    notes.sort((a, b) => a.time - b.time);

    // Otomatik BPM tespiti: MIDI header'da varsa onu al, yoksa zamanlamalardan analiz et
    let bpm = 120;
    if (midi.header.tempos.length > 0 && midi.header.tempos[0].bpm > 0) {
      bpm = Math.round(midi.header.tempos[0].bpm);
    } else {
      bpm = detectBpmFromNoteTimings(notes.map(n => n.time));
    }

    return {
      metadata: {
        title,
        artist: 'Open Synthesia',
        bpm,
        duration,
        totalNotes: notes.length,
        tracksCount: trackCount,
        timeSignature: midi.header.timeSignatures.length > 0 
          ? [midi.header.timeSignatures[0].timeSignature[0], midi.header.timeSignatures[0].timeSignature[1]]
          : [4, 4],
      },
      notes,
      rawMidiData: rawBytes,
    };
  }
}
