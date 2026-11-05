/**
 * MidiWriter.ts
 * Notalardan standart .mid dosyası üretici
 */

import { Midi } from '@tonejs/midi';
import { VisualNote } from '../types';

export class MidiWriter {
  public static createMidiFromNotes(notes: VisualNote[], bpm: number = 120, title: string = 'Transcribed Song'): Uint8Array {
    const midi = new Midi();
    midi.name = title;
    midi.header.setTempo(bpm);

    // Right Hand / Treble track
    const trackRight = midi.addTrack();
    trackRight.name = 'Right Hand';
    trackRight.channel = 0;

    // Left Hand / Bass track
    const trackLeft = midi.addTrack();
    trackLeft.name = 'Left Hand';
    trackLeft.channel = 1;

    for (const n of notes) {
      const targetTrack = n.hand === 'left' ? trackLeft : trackRight;
      targetTrack.addNote({
        midi: n.midi,
        time: Math.max(0, n.time),
        duration: Math.max(0.08, n.duration),
        velocity: Math.max(0.1, Math.min(1.0, n.velocity || 0.8)),
      });
    }

    return midi.toArray();
  }

  public static downloadMidi(midiBytes: Uint8Array, filename: string = 'song.mid'): void {
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
