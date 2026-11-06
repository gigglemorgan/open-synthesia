/**
 * PianoKeyboard.tsx
 * Ultra-Fast Canvas 88-Key Piano with Weighted Hammer Action Dip
 *
 * - Reads directly from activeNotesRef: ZERO React re-render overhead during playback
 * - Weighted Key Dip: Realistic 3mm pivot travel when hammer strikes
 * - Single Canvas: O(1) hit testing, zero DOM reflows
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { ActiveNote, VisualNote } from '../types';
import { PIANO_KEYS_88, TOTAL_WHITE_KEYS, getKeyBounds } from './pianoLayout';
import { midiManager } from '../midi/MidiManager';

interface PianoKeyboardProps {
  activeNotesRef: React.MutableRefObject<Map<number, ActiveNote>>;
  waitingNotes?: VisualNote[];
  onNotePress?: (midi: number) => void;
  onNoteRelease?: (midi: number) => void;
  showLabels?: boolean;
  showKeyBindings?: boolean;
  sustainPedalActive?: boolean;
  hammerActionEnabled?: boolean;
}

const COL_WHITE = '#f1f2f5';
const COL_WHITE_LIP = '#e1e3e8';
const COL_BLACK = '#13151b';
const COL_BORDER = '#b0b2ba';
const COL_BLACK_BORDER = '#08090d';
const COL_USER = '#6366f1';
const COL_LEFT = '#38bdf8';
const COL_RIGHT = '#34d399';
const COL_WAITING = '#f59e0b';
const COL_FELT = '#a81c1c';
const COL_SUSTAIN = '#f59e0b';
const COL_BG = '#060709';

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotesRef,
  waitingNotes = [],
  onNotePress,
  onNoteRelease,
  showLabels = true,
  showKeyBindings = true,
  sustainPedalActive = false,
  hammerActionEnabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pressedMidiRef = useRef<number | null>(null);

  const waitingNotesRef = useRef(waitingNotes);
  const showKeyBindingsRef = useRef(showKeyBindings);
  const sustainRef = useRef(sustainPedalActive);
  const hammerRef = useRef(hammerActionEnabled);

  waitingNotesRef.current = waitingNotes;
  showKeyBindingsRef.current = showKeyBindings;
  sustainRef.current = sustainPedalActive;
  hammerRef.current = hammerActionEnabled;

  const hitTest = useCallback((canvasX: number, canvasY: number, width: number, height: number): number | null => {
    const blackH = height * 0.62;
    if (canvasY < blackH) {
      for (let i = PIANO_KEYS_88.length - 1; i >= 0; i--) {
        const k = PIANO_KEYS_88[i];
        if (!k.isBlack) continue;
        const b = getKeyBounds(k.midi);
        const kx = b.x * width;
        const kw = b.width * width;
        if (canvasX >= kx && canvasX <= kx + kw) return k.midi;
      }
    }
    for (let i = 0; i < PIANO_KEYS_88.length; i++) {
      const k = PIANO_KEYS_88[i];
      if (k.isBlack) continue;
      const b = getKeyBounds(k.midi);
      const kx = b.x * width;
      const kw = b.width * width;
      if (canvasX >= kx && canvasX <= kx + kw) return k.midi;
    }
    return null;
  }, []);

  const getCanvasXY = useCallback((e: React.MouseEvent | React.TouchEvent): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY : e.clientY;
    return [clientX - rect.left, clientY - rect.top];
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('preventDefault' in e && 'touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const xy = getCanvasXY(e);
    if (!xy) return;
    const midi = hitTest(xy[0], xy[1], canvas.clientWidth, canvas.clientHeight);
    if (midi !== null) {
      pressedMidiRef.current = midi;
      onNotePress?.(midi);
    }
  }, [hitTest, getCanvasXY, onNotePress]);

  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('preventDefault' in e && 'touches' in e) e.preventDefault();
    if (pressedMidiRef.current !== null) {
      onNoteRelease?.(pressedMidiRef.current);
      pressedMidiRef.current = null;
    }
  }, [onNoteRelease]);

  // === CANVAS RENDER LOOP (Created ONCE, zero GC) ===
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const _active = activeNotesRef.current;
      const _waiting = waitingNotesRef.current;
      const _showBindings = showKeyBindingsRef.current;
      const _sustain = sustainRef.current;
      const _hammer = hammerRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = COL_BG;
      ctx.fillRect(0, 0, w, h);

      // Red Felt Strip
      ctx.fillStyle = COL_FELT;
      ctx.fillRect(0, 0, w, 3);

      // Sustain Pedal Bar
      if (_sustain) {
        ctx.fillStyle = COL_SUSTAIN;
        ctx.fillRect(0, 3, w, 2);
      }

      const yOff = _sustain ? 5 : 3;
      const keyH = h - yOff;
      const blackH = keyH * 0.62;

      const waitingSet = _waiting.length > 0 ? new Set(_waiting.map(n => n.midi)) : null;

      // --- WHITE KEYS ---
      for (let i = 0; i < PIANO_KEYS_88.length; i++) {
        const k = PIANO_KEYS_88[i];
        if (k.isBlack) continue;

        const b = getKeyBounds(k.midi);
        const kx = b.x * w;
        const kw = b.width * w;

        const active = _active.get(k.midi);
        const isWait = waitingSet ? waitingSet.has(k.midi) : false;

        // Hammer Action key dip travel (3px depression)
        const dip = active && _hammer ? 3.0 : 0;
        const currentY = yOff + dip;
        const currentH = keyH - dip;

        if (dip > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(kx + 0.5, yOff, kw - 1, dip);
        }

        if (isWait) {
          ctx.fillStyle = COL_WAITING;
        } else if (active) {
          ctx.fillStyle = active.source === 'user' ? COL_USER
            : active.hand === 'left' ? COL_LEFT : COL_RIGHT;
        } else {
          ctx.fillStyle = COL_WHITE;
        }

        const r = 2.5;
        ctx.beginPath();
        ctx.moveTo(kx + 0.5, currentY);
        ctx.lineTo(kx + kw - 0.5, currentY);
        ctx.lineTo(kx + kw - 0.5, currentY + currentH - r);
        ctx.arcTo(kx + kw - 0.5, currentY + currentH, kx + kw - r, currentY + currentH, r);
        ctx.lineTo(kx + r, currentY + currentH);
        ctx.arcTo(kx + 0.5, currentY + currentH, kx + 0.5, currentY + currentH - r, r);
        ctx.closePath();
        ctx.fill();

        if (!active && !isWait) {
          ctx.fillStyle = COL_WHITE_LIP;
          ctx.fillRect(kx + 1, currentY + currentH - 4, kw - 2, 3);
        }

        ctx.strokeStyle = COL_BORDER;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Key binding badge
        if (_showBindings) {
          const letter = midiManager.getKeyForMidi(k.midi);
          if (letter) {
            const cx = kx + kw / 2;
            const cy = currentY + currentH - 20;
            ctx.fillStyle = 'rgba(210, 212, 220, 0.85)';
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter.toUpperCase(), cx, cy + 0.5);
          }
        }

        if (showLabels && k.noteName.startsWith('C')) {
          ctx.fillStyle = active || isWait ? 'rgba(255,255,255,0.9)' : 'rgba(110,115,130,0.7)';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(k.noteName, kx + kw / 2, currentY + currentH - 7);
        }
      }

      // --- BLACK KEYS ---
      for (let i = 0; i < PIANO_KEYS_88.length; i++) {
        const k = PIANO_KEYS_88[i];
        if (!k.isBlack) continue;

        const b = getKeyBounds(k.midi);
        const kx = b.x * w;
        const kw = b.width * w;

        const active = _active.get(k.midi);
        const isWait = waitingSet ? waitingSet.has(k.midi) : false;

        const dip = active && _hammer ? 2.5 : 0;
        const currentY = yOff + dip;
        const currentH = blackH - dip;

        if (dip > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(kx, yOff, kw, dip);
        }

        if (isWait) {
          ctx.fillStyle = COL_WAITING;
        } else if (active) {
          ctx.fillStyle = active.source === 'user' ? COL_USER
            : active.hand === 'left' ? '#0ea5e9' : '#059669';
        } else {
          ctx.fillStyle = COL_BLACK;
        }

        const r = 2;
        ctx.beginPath();
        ctx.moveTo(kx, currentY);
        ctx.lineTo(kx + kw, currentY);
        ctx.lineTo(kx + kw, currentY + currentH - r);
        ctx.arcTo(kx + kw, currentY + currentH, kx + kw - r, currentY + currentH, r);
        ctx.lineTo(kx + r, currentY + currentH);
        ctx.arcTo(kx, currentY + currentH, kx, currentY + currentH - r, r);
        ctx.closePath();
        ctx.fill();

        if (!active && !isWait) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(kx + 1, currentY + 1, kw - 2, 2);
        }

        ctx.strokeStyle = COL_BLACK_BORDER;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        if (_showBindings) {
          const letter = midiManager.getKeyForMidi(k.midi);
          if (letter) {
            const cx = kx + kw / 2;
            const cy = currentY + currentH - 10;
            ctx.fillStyle = 'rgba(30,32,42,0.95)';
            ctx.beginPath();
            ctx.roundRect(cx - 5, cy - 5, 10, 10, 2);
            ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter.toUpperCase(), cx, cy + 0.5);
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animId); };
  }, [showLabels]);

  return (
    <div className="relative w-full h-28 select-none bg-[#060709]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
};
