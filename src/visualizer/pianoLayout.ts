/**
 * pianoLayout.ts
 * 88-Key Piano Geometry & Coordinate Calculator
 * A0 (MIDI 21) - C8 (MIDI 108)
 *
 * Pre-computed lookup tables for O(1) access — zero allocation at render time.
 */

export interface KeyLayout {
  midi: number;
  isBlack: boolean;
  whiteIndex: number;
  noteName: string;
}

const BLACK_NOTES = new Set([1, 3, 6, 8, 10]);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function isBlackKey(midi: number): boolean {
  return BLACK_NOTES.has(midi % 12);
}

export const TOTAL_WHITE_KEYS = 52;

// Pre-compute all 88 keys once
function buildKeys(): KeyLayout[] {
  const keys: KeyLayout[] = [];
  let whiteCount = 0;
  for (let midi = 21; midi <= 108; midi++) {
    const black = isBlackKey(midi);
    keys.push({
      midi,
      isBlack: black,
      whiteIndex: black ? -1 : whiteCount,
      noteName: `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`,
    });
    if (!black) whiteCount++;
  }
  return keys;
}

export const PIANO_KEYS_88 = buildKeys();

// Pre-compute bounds for all 88 keys into a flat lookup array (O(1) by midi)
export interface KeyBounds {
  x: number;      // normalized 0..1
  width: number;   // normalized 0..1
  isBlack: boolean;
}

const boundsLookup: KeyBounds[] = new Array(128);

(function precomputeBounds() {
  const ww = 1 / TOTAL_WHITE_KEYS;
  const bw = ww * 0.65;

  // Build white index lookup
  const whiteIdx = new Int8Array(128).fill(-1);
  let wi = 0;
  for (let m = 21; m <= 108; m++) {
    if (!isBlackKey(m)) { whiteIdx[m] = wi; wi++; }
  }

  for (let m = 21; m <= 108; m++) {
    if (!isBlackKey(m)) {
      boundsLookup[m] = { x: whiteIdx[m] * ww, width: ww, isBlack: false };
    } else {
      let prev = 0;
      for (let p = m - 1; p >= 21; p--) {
        if (whiteIdx[p] >= 0) { prev = whiteIdx[p]; break; }
      }
      boundsLookup[m] = { x: (prev + 0.68) * ww, width: bw, isBlack: true };
    }
  }
})();

export function getKeyBounds(midi: number): KeyBounds {
  return boundsLookup[midi] || { x: 0, width: 0, isBlack: false };
}
