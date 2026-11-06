export interface VisualNote {
  id: string;
  midi: number;         // 21 - 108 (A0 - C8)
  noteName: string;     // e.g. "C4", "F#5"
  time: number;         // Start time in seconds
  duration: number;     // Duration in seconds
  velocity: number;     // 0 - 1
  hand: 'left' | 'right' | 'both'; // Left = Sol El (Bass), Right = Sağ El (Treble)
  trackIndex?: number;
  hit?: boolean;        // In practice mode, has user hit this note?
}

export interface SongMetadata {
  title: string;
  artist?: string;
  bpm: number;
  duration: number;
  totalNotes: number;
  tracksCount: number;
  timeSignature?: [number, number];
}

export interface SustainEvent {
  time: number;
  isDown: boolean;
}

export interface LoadedSong {
  metadata: SongMetadata;
  notes: VisualNote[];
  sustainEvents?: SustainEvent[];
  rawMidiData?: Uint8Array;
}

export type PlaybackMode = 'play' | 'practice-wait' | 'practice-rhythm';

export type HandSelection = 'both' | 'right' | 'left';

export interface PracticeStats {
  notesTotal: number;
  notesHit: number;
  notesMissed: number;
  currentStreak: number;
  maxStreak: number;
  accuracy: number; // 0 - 100%
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
}

export interface ActiveNote {
  midi: number;
  velocity: number;
  source: 'playback' | 'user';
  hand?: 'left' | 'right' | 'both';
}
