/**
 * PianoKeyboard.tsx
 * Canvas-Based 88-Key Piano — ZERO DOM elements for keys.
 *
 * Single <canvas> draws all 88 keys, active highlights, key labels.
 * Mouse/touch interaction via hit-testing on canvas coordinates.
 * Reads activeNotes from a ref for zero re-render overhead.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { ActiveNote, VisualNote } from '../types';
import { PIANO_KEYS_88, TOTAL_WHITE_KEYS, getKeyBounds, isBlackKey } from './pianoLayout';
import { midiManager } from '../midi/MidiManager';

interface PianoKeyboardProps {
  activeNotes: Map<number, ActiveNote>;
  waitingNotes?: VisualNote[];
  onNotePress?: (midi: number) => void;
  onNoteRelease?: (midi: number) => void;
  showLabels?: boolean;
  showKeyBindings?: boolean;
  sustainPedalActive?: boolean;
}

// Colors
const COL_WHITE = '#f0f1f3';
const COL_WHITE_HOVER = '#e4e5e8';
const COL_BLACK = '#15171e';
const COL_BORDER = '#c0c2c8';
const COL_BLACK_BORDER = '#0c0d12';
const COL_USER = '#6366f1';
const COL_LEFT = '#38bdf8';
const COL_RIGHT = '#34d399';
const COL_WAITING = '#f59e0b';
const COL_FELT = '#991b1b';
const COL_SUSTAIN = '#f59e0b';
const COL_BG = '#0a0b0e';

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes,
  waitingNotes = [],
  onNotePress,
  onNoteRelease,
  showLabels = true,
  showKeyBindings = true,
  sustainPedalActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pressedMidiRef = useRef<number | null>(null);

  // Store props in refs for rAF
  const activeNotesRef = useRef(activeNotes);
  const waitingNotesRef = useRef(waitingNotes);
  const showKeyBindingsRef = useRef(showKeyBindings);
  const sustainRef = useRef(sustainPedalActive);

  activeNotesRef.current = activeNotes;
  waitingNotesRef.current = waitingNotes;
  showKeyBindingsRef.current = showKeyBindings;
  sustainRef.current = sustainPedalActive;

  // Hit-test: find which MIDI note is at canvas pixel (x, y)
  const hitTest = useCallback((canvasX: number, canvasY: number, width: number, height: number): number | null => {
    const blackH = height * 0.62;
    // Check blacks first (they overlay whites)
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
    // Check whites
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

  // Mouse/touch handlers
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

  // === CANVAS RENDER LOOP ===
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

      // Red felt strip
      ctx.fillStyle = COL_FELT;
      ctx.fillRect(0, 0, w, 3);

      // Sustain indicator
      if (_sustain) {
        ctx.fillStyle = COL_SUSTAIN;
        ctx.fillRect(0, 3, w, 2);
      }

      const yOff = _sustain ? 5 : 3;
      const keyH = h - yOff;
      const blackH = keyH * 0.62;
      const ww = w / TOTAL_WHITE_KEYS;

      const waitingSet = new Set(_waiting.map(n => n.midi));

      // --- WHITE KEYS ---
      for (let i = 0; i < PIANO_KEYS_88.length; i++) {
        const k = PIANO_KEYS_88[i];
        if (k.isBlack) continue;

        const b = getKeyBounds(k.midi);
        const kx = b.x * w;
        const kw = b.width * w;

        const active = _active.get(k.midi);
        const isWait = waitingSet.has(k.midi);

        // Key fill
        if (isWait) {
          ctx.fillStyle = COL_WAITING;
        } else if (active) {
          ctx.fillStyle = active.source === 'user' ? COL_USER
            : active.hand === 'left' ? COL_LEFT : COL_RIGHT;
        } else {
          ctx.fillStyle = COL_WHITE;
        }

        // Rounded bottom corners via path
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(kx + 0.5, yOff);
        ctx.lineTo(kx + kw - 0.5, yOff);
        ctx.lineTo(kx + kw - 0.5, yOff + keyH - r);
        ctx.arcTo(kx + kw - 0.5, yOff + keyH, kx + kw - r, yOff + keyH, r);
        ctx.lineTo(kx + r, yOff + keyH);
        ctx.arcTo(kx + 0.5, yOff + keyH, kx + 0.5, yOff + keyH - r, r);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = COL_BORDER;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Key binding letter
        if (_showBindings) {
          const letter = midiManager.getKeyForMidi(k.midi);
          if (letter) {
            const cx = kx + kw / 2;
            const cy = yOff + keyH - 22;
            ctx.fillStyle = 'rgba(200,200,210,0.85)';
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter.toUpperCase(), cx, cy + 0.5);
          }
        }

        // C labels
        if (showLabels && k.noteName.startsWith('C')) {
          ctx.fillStyle = active || isWait ? 'rgba(255,255,255,0.8)' : 'rgba(100,100,120,0.7)';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(k.noteName, kx + kw / 2, yOff + keyH - 8);
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
        const isWait = waitingSet.has(k.midi);

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
        ctx.moveTo(kx, yOff);
        ctx.lineTo(kx + kw, yOff);
        ctx.lineTo(kx + kw, yOff + blackH - r);
        ctx.arcTo(kx + kw, yOff + blackH, kx + kw - r, yOff + blackH, r);
        ctx.lineTo(kx + r, yOff + blackH);
        ctx.arcTo(kx, yOff + blackH, kx, yOff + blackH - r, r);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = COL_BLACK_BORDER;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Key binding
        if (_showBindings) {
          const letter = midiManager.getKeyForMidi(k.midi);
          if (letter) {
            const cx = kx + kw / 2;
            const cy = yOff + blackH - 10;
            ctx.fillStyle = 'rgba(40,42,55,0.9)';
            ctx.beginPath();
            ctx.roundRect(cx - 6, cy - 6, 12, 12, 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
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
    <div className="relative w-full h-32 select-none">
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
