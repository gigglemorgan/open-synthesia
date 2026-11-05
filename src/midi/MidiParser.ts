/**
 * MidiParser.ts
 * MIDI Dosyası Çözümleyici & El Ayrımı (Sağ El / Sol El)
 */

import { Midi } from '@tonejs/midi';
import { VisualNote, LoadedSong } from '../types';
import { midiToNoteName } from '../audio/PianoEngine';

export class MidiParser {
  /**
   * ArrayBuffer / Uint8Array formatındaki .mid dosyasını çözümler
   */
  public static parse(data: ArrayBuffer | Uint8Array, filename: string = 'Untitled'): LoadedSong {
    const midi = new Midi(data);
    const rawBytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    const notes: VisualNote[] = [];
    const bpm = midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120;
    const duration = midi.duration || 10;
    const title = midi.name || filename.replace(/\.[^/.]+$/, "") || 'İsimsiz Eser';

    const trackCount = midi.tracks.length;
    let noteIdCounter = 0;

    // Detect if multi-track piano (e.g. Track 0 = Right Hand, Track 1 = Left Hand)
    const activeTracks = midi.tracks.filter(t => t.notes.length > 0);
    const isSeparatedTracks = activeTracks.length >= 2;

    midi.tracks.forEach((track, trackIndex) => {
      // Find average pitch of track to decide default hand if multi-track
      let avgPitch = 60;
      if (track.notes.length > 0) {
        avgPitch = track.notes.reduce((sum, n) => sum + n.midi, 0) / track.notes.length;
      }

      track.notes.forEach((note) => {
        let hand: 'left' | 'right' = 'right';

        if (isSeparatedTracks) {
          // If tracks are distinct, lower average pitch track is Left Hand
          if (avgPitch < 58) {
            hand = 'left';
          } else if (avgPitch > 62) {
            hand = 'right';
          } else {
            // Tie-break based on note pitch
            hand = note.midi < 60 ? 'left' : 'right';
          }
        } else {
          // Single track: Split at Middle C (MIDI 60)
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

    // Sort notes chronologically
    notes.sort((a, b) => a.time - b.time);

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
