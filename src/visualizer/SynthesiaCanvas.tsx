/**
 * SynthesiaCanvas.tsx
 * Ultra High-Performance Waterfall Visualizer (Rush E / Black MIDI Optimized)
 *
 * Reads currentTime from a SHARED REF at 60fps — never from throttled React state.
 * Stable rAF loop: created once, never torn down.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { VisualNote, HandSelection } from '../types';
import { getKeyBounds, PIANO_KEYS_88 } from './pianoLayout';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface SynthesiaCanvasProps {
  notes: VisualNote[];
  /** Shared mutable ref written at 60fps by the playback loop — NOT throttled React state */
  currentTimeRef: React.MutableRefObject<number>;
  noteSpeed?: number;
  isWaiting?: boolean;
  waitingNotes?: VisualNote[];
  handSelection?: HandSelection;
  activeMidiSet?: Set<number>;
}

function findFirstVisibleIndex(notes: VisualNote[], time: number): number {
  let low = 0;
  let high = notes.length - 1;
  let result = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (notes[mid].time + notes[mid].duration >= time) {
      result = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return result;
}

export const SynthesiaCanvas: React.FC<SynthesiaCanvasProps> = ({
  notes,
  currentTimeRef,
  noteSpeed = 2.5,
  isWaiting = false,
  waitingNotes = [],
  handSelection = 'both',
  activeMidiSet = new Set(),
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastActiveRef = useRef<Set<number>>(new Set());

  // Store props in refs for stable rAF loop
  const noteSpeedRef = useRef(noteSpeed);
  const isWaitingRef = useRef(isWaiting);
  const waitingNotesRef = useRef(waitingNotes);
  const handSelectionRef = useRef(handSelection);
  const notesRef = useRef(notes);

  noteSpeedRef.current = noteSpeed;
  isWaitingRef.current = isWaiting;
  waitingNotesRef.current = waitingNotes;
  handSelectionRef.current = handSelection;
  notesRef.current = notes;

  const blackKeyBounds = useMemo(() => {
    return PIANO_KEYS_88.filter(k => k.isBlack).map(k => getKeyBounds(k.midi));
  }, []);

  const spawnHitParticles = useCallback((x: number, y: number, color: string) => {
    if (particlesRef.current.length > 30) return;
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI / 3) * i + Math.PI;
      const speed = Math.random() * 1.8 + 0.8;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5),
        vy: Math.sin(angle) * speed - 0.6,
        radius: Math.random() * 1.8 + 0.8,
        color, alpha: 0.8,
        decay: Math.random() * 0.05 + 0.04,
      });
    }
  }, []);

  useEffect(() => {
    const currentActive = activeMidiSet;
    const canvas = canvasRef.current;
    if (!canvas || currentActive.size === 0) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const maxSpawns = currentActive.size > 8 ? 3 : currentActive.size;
    let spawned = 0;
    currentActive.forEach((midi) => {
      if (!lastActiveRef.current.has(midi) && spawned < maxSpawns) {
        const bounds = getKeyBounds(midi);
        const x = (bounds.x + bounds.width / 2) * width;
        spawnHitParticles(x, height - 2, midi < 60 ? '#38bdf8' : '#34d399');
        spawned++;
      }
    });
    lastActiveRef.current = new Set(currentActive);
  }, [activeMidiSet, spawnHitParticles]);

  // === STABLE rAF RENDER LOOP — created once, reads from refs at native 60fps ===
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const _notes = notesRef.current;
      const _time = currentTimeRef.current; // 60fps from shared ref!
      const _speed = noteSpeedRef.current;
      const _waiting = isWaitingRef.current;
      const _waitNotes = waitingNotesRef.current;
      const _hand = handSelectionRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let i = 0; i < blackKeyBounds.length; i++) {
        const b = blackKeyBounds[i];
        ctx.fillRect(b.x * width, 0, b.width * width, height);
      }

      ctx.strokeStyle = _waiting ? '#f59e0b' : 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height - 1.5);
      ctx.lineTo(width, height - 1.5);
      ctx.stroke();

      const visibleStart = _time - 0.2;
      const visibleEnd = _time + _speed;
      const startIndex = findFirstVisibleIndex(_notes, visibleStart);
      const waitingIds = _waitNotes.length > 0 ? new Set(_waitNotes.map(n => n.id)) : null;

      for (let i = startIndex; i < _notes.length; i++) {
        const note = _notes[i];
        if (note.time > visibleEnd) break;
        if (_hand === 'right' && note.hand !== 'right') continue;
        if (_hand === 'left' && note.hand !== 'left') continue;
        const noteEnd = note.time + note.duration;
        if (noteEnd < visibleStart) continue;

        const bounds = getKeyBounds(note.midi);
        const x = bounds.x * width + 0.5;
        const w = Math.max(2, bounds.width * width - 1);
        const yBottom = height - ((note.time - _time) / _speed) * height;
        const yTop = height - ((noteEnd - _time) / _speed) * height;
        const noteHeight = Math.max(5, yBottom - yTop);

        ctx.fillStyle = note.hand === 'left' ? '#2563eb' : '#059669';
        ctx.fillRect(x, yTop, w, noteHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x, yTop, w, 1.5);

        if (waitingIds && waitingIds.has(note.id)) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, yTop - 1, w + 2, noteHeight + 2);
        }
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blackKeyBounds]);

  return (
    <div className="relative w-full flex-1 min-h-[300px] overflow-hidden bg-[#08090d]">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {isWaiting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#141620]/95 border border-amber-500/70 backdrop-blur-md rounded-md shadow-lg flex items-center space-x-2 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-amber-300 font-semibold tracking-wide">WAITING FOR INPUT...</span>
        </div>
      )}
    </div>
  );
};
