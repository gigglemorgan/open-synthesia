/**
 * sampleSongs.ts
 * Hazır Klasik & Etüd Piyano Eserleri
 * Für Elise, Türk Marşı, Bach Prelude, Moonlight Sonata
 */

import { VisualNote, LoadedSong } from '../types';
import { midiToNoteName } from '../audio/PianoEngine';

// Helper to build note
function createNote(
  id: number,
  midi: number,
  time: number,
  duration: number,
  hand: 'left' | 'right',
  velocity: number = 0.8
): VisualNote {
  return {
    id: `sample-note-${id}`,
    midi,
    noteName: midiToNoteName(midi),
    time,
    duration,
    hand,
    velocity,
    hit: false,
  };
}

/**
 * Beethoven - Für Elise (Piyanonun en sevilen etüd parçası)
 */
function generateFurElise(): VisualNote[] {
  const notes: VisualNote[] = [];
  let id = 1;

  // Main motif: E5 (76), D#5 (75), E5, D#5, E5, B4 (71), D5 (74), C5 (72), A4 (69)
  const motif = [
    { m: 76, d: 0.25 }, { m: 75, d: 0.25 }, { m: 76, d: 0.25 }, { m: 75, d: 0.25 },
    { m: 76, d: 0.25 }, { m: 71, d: 0.25 }, { m: 74, d: 0.25 }, { m: 72, d: 0.25 },
    { m: 69, d: 0.5 }
  ];

  let t = 0.5;
  // Repeat motif 2 times
  for (let r = 0; r < 2; r++) {
    for (const n of motif) {
      notes.push(createNote(id++, n.m, t, n.d, 'right', 0.85));
      t += n.d + 0.05;
    }

    // Left hand arpeggio: A2 (45), E3 (52), A3 (57), C4 (60), E4 (64)
    notes.push(createNote(id++, 45, t - 0.5, 1.2, 'left', 0.7));
    notes.push(createNote(id++, 52, t - 0.3, 1.0, 'left', 0.7));
    notes.push(createNote(id++, 57, t - 0.1, 0.8, 'left', 0.7));

    // Right hand continue: C4 (60), E4 (64), A4 (69), B4 (71)
    const cont1 = [{ m: 60, d: 0.25 }, { m: 64, d: 0.25 }, { m: 69, d: 0.25 }, { m: 71, d: 0.6 }];
    for (const n of cont1) {
      notes.push(createNote(id++, n.m, t, n.d, 'right', 0.85));
      t += n.d + 0.05;
    }

    // Left hand response: E2 (40), E3 (52), G#3 (56), E4 (64)
    notes.push(createNote(id++, 40, t - 0.6, 1.2, 'left', 0.7));
    notes.push(createNote(id++, 52, t - 0.4, 1.0, 'left', 0.7));
    notes.push(createNote(id++, 56, t - 0.2, 0.8, 'left', 0.7));

    const cont2 = [{ m: 64, d: 0.25 }, { m: 68, d: 0.25 }, { m: 71, d: 0.25 }, { m: 72, d: 0.6 }];
    for (const n of cont2) {
      notes.push(createNote(id++, n.m, t, n.d, 'right', 0.85));
      t += n.d + 0.05;
    }

    t += 0.3;
  }

  return notes;
}

/**
 * W. A. Mozart - Rondo Alla Turca (Türk Marşı)
 */
function generateTurkishMarch(): VisualNote[] {
  const notes: VisualNote[] = [];
  let id = 1000;
  let t = 0.5;

  // Opening Theme: B4 (71), A4 (69), G#4 (68), A4 (69), C5 (72)
  const theme = [
    { m: 71, d: 0.18 }, { m: 69, d: 0.18 }, { m: 68, d: 0.18 }, { m: 69, d: 0.18 },
    { m: 72, d: 0.45 },
    { m: 74, d: 0.18 }, { m: 72, d: 0.18 }, { m: 71, d: 0.18 }, { m: 72, d: 0.18 },
    { m: 76, d: 0.45 },
    { m: 77, d: 0.18 }, { m: 76, d: 0.18 }, { m: 75, d: 0.18 }, { m: 76, d: 0.18 },
    { m: 81, d: 0.6 }
  ];

  for (const n of theme) {
    notes.push(createNote(id++, n.m, t, n.d, 'right', 0.9));

    // March rhythmic left hand (staccato chords on A minor / A2, E3, A3)
    if (id % 2 === 0) {
      notes.push(createNote(id++, 45, t, 0.18, 'left', 0.75));
      notes.push(createNote(id++, 57, t, 0.18, 'left', 0.75));
    } else {
      notes.push(createNote(id++, 52, t, 0.18, 'left', 0.7));
      notes.push(createNote(id++, 60, t, 0.18, 'left', 0.7));
    }

    t += n.d + 0.06;
  }

  // Major section (Janissary Turkish March percussion rhythm): A major
  t += 0.3;
  const majorPart = [
    { m: 81, d: 0.3 }, { m: 79, d: 0.18 }, { m: 78, d: 0.18 }, { m: 79, d: 0.3 },
    { m: 81, d: 0.3 }, { m: 79, d: 0.18 }, { m: 78, d: 0.18 }, { m: 79, d: 0.3 },
    { m: 81, d: 0.4 }, { m: 78, d: 0.3 }, { m: 74, d: 0.6 }
  ];

  for (const n of majorPart) {
    notes.push(createNote(id++, n.m, t, n.d, 'right', 0.92));
    // Bass octave march
    notes.push(createNote(id++, 50, t, 0.22, 'left', 0.8));
    notes.push(createNote(id++, 62, t, 0.22, 'left', 0.8));
    t += n.d + 0.05;
  }

  return notes;
}

/**
 * J. S. Bach - Prelude in C Major (BWV 846)
 */
function generateBachPrelude(): VisualNote[] {
  const notes: VisualNote[] = [];
  let id = 2000;
  let t = 0.5;

  // Patterns of C Major arpeggio
  const chords = [
    // Measure 1: C Major (C4, E4, G4, C5, E5) with C3 bass
    { bass: [48, 52], arp: [55, 60, 64] },
    // Measure 2: Dm7 (D3, A3, D4, F4, A4)
    { bass: [50, 57], arp: [62, 65, 69] },
    // Measure 3: G7 (G2, D3, F3, B3, D4)
    { bass: [43, 50], arp: [53, 59, 62] },
    // Measure 4: C Major
    { bass: [48, 55], arp: [60, 64, 67] }
  ];

  for (const chord of chords) {
    // 2 iterations per measure
    for (let loop = 0; loop < 2; loop++) {
      // Left hand root
      notes.push(createNote(id++, chord.bass[0], t, 0.9, 'left', 0.75));
      t += 0.2;
      notes.push(createNote(id++, chord.bass[1], t, 0.8, 'left', 0.7));
      t += 0.2;

      // Right hand ascending
      for (const pitch of chord.arp) {
        notes.push(createNote(id++, pitch, t, 0.5, 'right', 0.8));
        t += 0.2;
      }
      // Top note repeat
      notes.push(createNote(id++, chord.arp[chord.arp.length - 1], t, 0.5, 'right', 0.8));
      t += 0.2;
    }
  }

  return notes;
}

/**
 * Beethoven - Moonlight Sonata (Ay Işığı Sonatı Op. 27 No. 2)
 */
function generateMoonlightSonata(): VisualNote[] {
  const notes: VisualNote[] = [];
  let id = 3000;
  let t = 0.5;

  // Deep C# minor bass octaves (C#2 = 37, C#3 = 49)
  notes.push(createNote(id++, 37, t, 4.0, 'left', 0.8));
  notes.push(createNote(id++, 49, t, 4.0, 'left', 0.8));

  // Triplet arpeggio: G#3 (56), C#4 (61), E4 (64)
  const triplet = [56, 61, 64];
  for (let bar = 0; bar < 4; bar++) {
    for (const p of triplet) {
      notes.push(createNote(id++, p, t, 0.35, 'right', 0.65));
      t += 0.3;
    }
  }

  // Melody enters: G#4 (68) dotted rhythm
  notes.push(createNote(id++, 68, t, 1.2, 'right', 0.9));
  notes.push(createNote(id++, 36, t, 3.5, 'left', 0.75)); // B2 bass
  notes.push(createNote(id++, 48, t, 3.5, 'left', 0.75));

  for (let bar = 0; bar < 3; bar++) {
    for (const p of [56, 59, 64]) {
      notes.push(createNote(id++, p, t, 0.35, 'right', 0.65));
      t += 0.3;
    }
  }

  return notes;
}

export const SAMPLE_SONGS: LoadedSong[] = [
  {
    metadata: {
      title: 'Für Elise (Bagatelle No. 25)',
      artist: 'Ludwig van Beethoven',
      bpm: 130,
      duration: 15,
      totalNotes: 0,
      tracksCount: 2,
    },
    notes: generateFurElise(),
  },
  {
    metadata: {
      title: 'Rondo Alla Turca (Türk Marşı)',
      artist: 'Wolfgang Amadeus Mozart',
      bpm: 125,
      duration: 18,
      totalNotes: 0,
      tracksCount: 2,
    },
    notes: generateTurkishMarch(),
  },
  {
    metadata: {
      title: 'Prelude in C Major (BWV 846)',
      artist: 'Johann Sebastian Bach',
      bpm: 100,
      duration: 16,
      totalNotes: 0,
      tracksCount: 2,
    },
    notes: generateBachPrelude(),
  },
  {
    metadata: {
      title: 'Moonlight Sonata (Ay Işığı Sonatı)',
      artist: 'Ludwig van Beethoven',
      bpm: 60,
      duration: 15,
      totalNotes: 0,
      tracksCount: 2,
    },
    notes: generateMoonlightSonata(),
  }
];

// Set totalNotes on metadata
SAMPLE_SONGS.forEach(s => {
  s.metadata.totalNotes = s.notes.length;
  if (s.notes.length > 0) {
    const last = s.notes[s.notes.length - 1];
    s.metadata.duration = Math.ceil(last.time + last.duration + 1);
  }
});
