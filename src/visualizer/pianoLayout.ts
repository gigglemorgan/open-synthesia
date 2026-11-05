/**
 * pianoLayout.ts
 * 88 Tuşlu Piyano Geometrisi ve Koordinat Hesaplayıcı
 * A0 (MIDI 21) - C8 (MIDI 108)
 */

export interface KeyLayout {
  midi: number;
  isBlack: boolean;
  whiteIndex: number;
  noteName: string;
}

// Check if a midi note is a black key (sharp/flat)
export function isBlackKey(midi: number): boolean {
  const noteInOctave = midi % 12;
  // C# (1), D# (3), F# (6), G# (8), A# (10)
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

// Generate the 88 keys layout
export function generatePianoKeys(): KeyLayout[] {
  const keys: KeyLayout[] = [];
  let whiteCount = 0;

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  for (let midi = 21; midi <= 108; midi++) {
    const isBlack = isBlackKey(midi);
    const noteName = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

    keys.push({
      midi,
      isBlack,
      whiteIndex: isBlack ? -1 : whiteCount,
      noteName,
    });

    if (!isBlack) {
      whiteCount++;
    }
  }

  return keys;
}

export const PIANO_KEYS_88 = generatePianoKeys();
export const TOTAL_WHITE_KEYS = 52;

/**
 * Calculates normalized X position (0 to 1) and width (0 to 1) for any MIDI note (21 to 108)
 */
export function getKeyBounds(midi: number): { x: number; width: number; isBlack: boolean } {
  if (midi < 21 || midi > 108) {
    return { x: 0, width: 0, isBlack: false };
  }

  const whiteKeyWidth = 1 / TOTAL_WHITE_KEYS;
  const blackKeyWidth = whiteKeyWidth * 0.65;

  const key = PIANO_KEYS_88.find(k => k.midi === midi);
  if (!key) return { x: 0, width: 0, isBlack: false };

  if (!key.isBlack) {
    return {
      x: key.whiteIndex * whiteKeyWidth,
      width: whiteKeyWidth,
      isBlack: false,
    };
  } else {
    // Find preceding white key
    let prevWhiteIndex = 0;
    for (let m = midi - 1; m >= 21; m--) {
      const prev = PIANO_KEYS_88.find(k => k.midi === m);
      if (prev && !prev.isBlack) {
        prevWhiteIndex = prev.whiteIndex;
        break;
      }
    }
    // Center black key between white keys
    const x = (prevWhiteIndex + 0.68) * whiteKeyWidth;
    return {
      x,
      width: blackKeyWidth,
      isBlack: true,
    };
  }
}
