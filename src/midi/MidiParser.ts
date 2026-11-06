/**
 * MidiParser.ts
 * MIDI File Parser, Smart Hand Split, Auto-BPM Detection & CC64 Sustain Pedal Handling
 */

import { Midi } from '@tonejs/midi';
import { VisualNote, LoadedSong, SustainEvent } from '../types';
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
   * Parses .mid array buffer or raw bytes
   */
  public static parse(data: ArrayBuffer | Uint8Array, filename: string = 'Untitled'): LoadedSong {
    const midi = new Midi(data);
    const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const notes: VisualNote[] = [];
    const duration = midi.duration || 10;
    const title = midi.name || filename.replace(/\.[^/.]+$/, "") || 'Untitled';

    const trackCount = midi.tracks.length;
    let noteIdCounter = 0;

    const activeTracks = midi.tracks.filter(t => t.notes.length > 0);
    const isSeparatedTracks = activeTracks.length >= 2;

    // 1. Extract notes
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
          duration: Math.max(0.08, note.duration),
          velocity: note.velocity || 0.8,
          hand,
          trackIndex,
          hit: false,
        });
      });
    });

    notes.sort((a, b) => a.time - b.time);

    // 2. Extract CC 64 Sustain Pedal events across all tracks
    const sustainEvents: SustainEvent[] = [];
    midi.tracks.forEach((track) => {
      const cc64List = track.controlChanges[64];
      if (cc64List && Array.isArray(cc64List)) {
        cc64List.forEach((cc) => {
          const val = typeof cc.value === 'number' ? cc.value : 0;
          const isDown = val >= 0.5 || val >= 64;
          sustainEvents.push({ time: cc.time, isDown });
        });
      }
    });

    sustainEvents.sort((a, b) => a.time - b.time);

    // 3. Acoustic Piano Sustain Elongation:
    // If pedal is held down while a note is struck or ringing, acoustic grand piano strings continue
    // vibrating until the sustain pedal is released!
    if (sustainEvents.length > 0) {
      interface PedalInterval {
        start: number;
        end: number;
      }
      const intervals: PedalInterval[] = [];
      let currentPedalDown: number | null = null;

      for (const evt of sustainEvents) {
        if (evt.isDown && currentPedalDown === null) {
          currentPedalDown = evt.time;
        } else if (!evt.isDown && currentPedalDown !== null) {
          intervals.push({ start: currentPedalDown, end: evt.time });
          currentPedalDown = null;
        }
      }
      if (currentPedalDown !== null) {
        intervals.push({ start: currentPedalDown, end: duration + 1 });
      }

      if (intervals.length > 0) {
        notes.forEach((note) => {
          const noteEnd = note.time + note.duration;
          for (const interval of intervals) {
            // Note is struck during pedal press or is ringing when pedal is depressed
            if (note.time >= interval.start && note.time < interval.end) {
              const sustainedEnd = Math.max(noteEnd, interval.end);
              // Cap at 10 seconds to avoid Black MIDI hanging
              note.duration = Math.min(sustainedEnd - note.time, 10);
              break;
            } else if (noteEnd > interval.start && note.time < interval.start) {
              const sustainedEnd = Math.max(noteEnd, interval.end);
              note.duration = Math.min(sustainedEnd - note.time, 10);
              break;
            }
          }
        });
      }
    }

    // 4. Automatic BPM detection
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
      sustainEvents,
      rawMidiData: rawBytes,
    };
  }
}
