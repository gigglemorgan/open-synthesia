/**
 * PracticeEngine.ts
 * Piyano Etüd & Eğitim Motoru
 * - Bekleme Modu (Wait-for-key / Synthesia Practice Mode)
 * - El Seçimi (Sağ El, Sol El, İki El)
 * - A-B Loop (Bölüm Tekrarı)
 * - Doğruluk ve Seri Skoru (Streak, Accuracy, Combo)
 */

import { VisualNote, PlaybackMode, HandSelection, PracticeStats } from '../types';

export interface PracticeEngineConfig {
  mode: PlaybackMode;
  hand: HandSelection;
  tempoMultiplier: number;
  loopStart: number | null;
  loopEnd: number | null;
}

export class PracticeEngine {
  private notes: VisualNote[] = [];
  private currentTime = 0;
  private isPaused = false;
  private isWaitingForUser = false;
  private notesToHit: VisualNote[] = [];

  private stats: PracticeStats = {
    notesTotal: 0,
    notesHit: 0,
    notesMissed: 0,
    currentStreak: 0,
    maxStreak: 0,
    accuracy: 100,
  };

  private config: PracticeEngineConfig = {
    mode: 'play',
    hand: 'both',
    tempoMultiplier: 1.0,
    loopStart: null,
    loopEnd: null,
  };

  private onStatsChange?: (stats: PracticeStats) => void;
  private onWaitingChange?: (isWaiting: boolean, waitingNotes: VisualNote[]) => void;
  private onLoopRestart?: () => void;

  constructor(notes: VisualNote[] = []) {
    this.setNotes(notes);
  }

  public setNotes(notes: VisualNote[]): void {
    this.notes = notes.map(n => ({ ...n, hit: false }));
    this.resetStats();
  }

  public setConfig(newConfig: Partial<PracticeEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PracticeEngineConfig {
    return this.config;
  }

  public resetStats(): void {
    const relevantNotes = this.getRelevantNotes();
    this.stats = {
      notesTotal: relevantNotes.length,
      notesHit: 0,
      notesMissed: 0,
      currentStreak: 0,
      maxStreak: 0,
      accuracy: 100,
    };
    this.notes.forEach(n => { n.hit = false; });
    this.isWaitingForUser = false;
    this.notesToHit = [];
    this.onStatsChange?.(this.stats);
  }

  public getStats(): PracticeStats {
    return this.stats;
  }

  public subscribeStats(cb: (stats: PracticeStats) => void) {
    this.onStatsChange = cb;
  }

  public subscribeWaiting(cb: (isWaiting: boolean, notes: VisualNote[]) => void) {
    this.onWaitingChange = cb;
  }

  public subscribeLoopRestart(cb: () => void) {
    this.onLoopRestart = cb;
  }

  private isHandApplicable(noteHand: 'left' | 'right' | 'both'): boolean {
    if (this.config.hand === 'both') return true;
    if (this.config.hand === 'right') return noteHand === 'right';
    if (this.config.hand === 'left') return noteHand === 'left';
    return true;
  }

  private getRelevantNotes(): VisualNote[] {
    return this.notes.filter(n => this.isHandApplicable(n.hand));
  }

  /**
   * Called every animation frame
   * Returns true if time should advance, false if paused or waiting for user
   */
  public update(time: number, dt: number): { shouldAdvance: boolean; nextTime: number } {
    this.currentTime = time;

    // Check A-B Loop
    if (this.config.loopStart !== null && this.config.loopEnd !== null) {
      if (this.currentTime >= this.config.loopEnd) {
        this.onLoopRestart?.();
        return { shouldAdvance: false, nextTime: this.config.loopStart };
      }
    }

    if (this.config.mode === 'practice-wait') {
      // Find notes crossing the hit line right now (e.g. within 0.05s window)
      // that the user has not hit yet and are for user's assigned hand
      const pendingNotes = this.notes.filter(n => {
        const isTarget = this.isHandApplicable(n.hand);
        const hasPassed = n.time <= this.currentTime + 0.03;
        return isTarget && hasPassed && !n.hit;
      });

      if (pendingNotes.length > 0) {
        this.isWaitingForUser = true;
        this.notesToHit = pendingNotes;
        this.onWaitingChange?.(true, pendingNotes);
        return { shouldAdvance: false, nextTime: this.currentTime };
      } else {
        if (this.isWaitingForUser) {
          this.isWaitingForUser = false;
          this.notesToHit = [];
          this.onWaitingChange?.(false, []);
        }
      }
    }

    return {
      shouldAdvance: true,
      nextTime: this.currentTime + dt * this.config.tempoMultiplier,
    };
  }

  /**
   * Called when user presses a key on MIDI keyboard or screen
   * Returns true if this note matched an expected practice note
   */
  public handleUserNotePress(midi: number): boolean {
    if (this.config.mode === 'play') {
      return false;
    }

    if (this.config.mode === 'practice-wait') {
      // Find matching note in waiting pool or upcoming notes within 0.25s
      const matchIndex = this.notesToHit.findIndex(n => n.midi === midi && !n.hit);

      if (matchIndex !== -1) {
        const matchedNote = this.notesToHit[matchIndex];
        matchedNote.hit = true;
        this.notesToHit.splice(matchIndex, 1);

        this.recordHit();

        if (this.notesToHit.length === 0) {
          this.isWaitingForUser = false;
          this.onWaitingChange?.(false, []);
        }
        return true;
      }

      // Check upcoming notes slightly ahead
      const upcoming = this.notes.find(n => 
        this.isHandApplicable(n.hand) &&
        !n.hit &&
        n.midi === midi &&
        Math.abs(n.time - this.currentTime) < 0.25
      );

      if (upcoming) {
        upcoming.hit = true;
        this.recordHit();
        return true;
      }
    } else if (this.config.mode === 'practice-rhythm') {
      // Check rhythm accuracy window (± 0.2s)
      const target = this.notes.find(n =>
        this.isHandApplicable(n.hand) &&
        !n.hit &&
        n.midi === midi &&
        Math.abs(n.time - this.currentTime) < 0.25
      );

      if (target) {
        target.hit = true;
        this.recordHit();
        return true;
      } else {
        this.recordMiss();
      }
    }

    return false;
  }

  private recordHit(): void {
    this.stats.notesHit++;
    this.stats.currentStreak++;
    if (this.stats.currentStreak > this.stats.maxStreak) {
      this.stats.maxStreak = this.stats.currentStreak;
    }
    this.recalculateAccuracy();
    this.onStatsChange?.({ ...this.stats });
  }

  private recordMiss(): void {
    this.stats.notesMissed++;
    this.stats.currentStreak = 0;
    this.recalculateAccuracy();
    this.onStatsChange?.({ ...this.stats });
  }

  private recalculateAccuracy(): void {
    const totalAttempted = this.stats.notesHit + this.stats.notesMissed;
    if (totalAttempted === 0) {
      this.stats.accuracy = 100;
    } else {
      this.stats.accuracy = Math.round((this.stats.notesHit / totalAttempted) * 100);
    }
  }

  public getNotesToHit(): VisualNote[] {
    return this.notesToHit;
  }

  public getIsWaiting(): boolean {
    return this.isWaitingForUser;
  }
}
