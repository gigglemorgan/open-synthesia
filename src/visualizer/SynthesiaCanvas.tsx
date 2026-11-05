/**
 * SynthesiaCanvas.tsx
 * 60+ FPS Synthesia Şelale (Falling Notes) Görselleştirici
 * - Sol el (Kobalt Mavi) ve Sağ el (Zümrüt Yeşil)
 * - Tuş şeritleri ve hassas nota hizalaması
 * - Doğal vuruş parçacıkları ve temiz etüd göstergesi
 */

import React, { useRef, useEffect, useCallback } from 'react';
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
  currentTime: number;
  noteSpeed?: number;
  isWaiting?: boolean;
  waitingNotes?: VisualNote[];
  handSelection?: HandSelection;
  activeMidiSet?: Set<number>;
}

export const SynthesiaCanvas: React.FC<SynthesiaCanvasProps> = ({
  notes,
  currentTime,
  noteSpeed = 2.5,
  isWaiting = false,
  waitingNotes = [],
  handSelection = 'both',
  activeMidiSet = new Set(),
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastActiveRef = useRef<Set<number>>(new Set());

  // Spawn hit particles
  const spawnHitParticles = useCallback((x: number, y: number, color: string) => {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / count) * i + Math.PI;
      const speed = Math.random() * 2.5 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5,
        vy: Math.sin(angle) * speed - 1.0,
        radius: Math.random() * 2 + 1,
        color,
        alpha: 0.9,
        decay: Math.random() * 0.035 + 0.025,
      });
    }
  }, []);

  // Check newly activated notes to trigger particles
  useEffect(() => {
    const currentActive = activeMidiSet;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    currentActive.forEach((midi) => {
      if (!lastActiveRef.current.has(midi)) {
        const bounds = getKeyBounds(midi);
        const x = (bounds.x + bounds.width / 2) * width;
        const color = midi < 60 ? '#60a5fa' : '#34d399';
        spawnHitParticles(x, height - 2, color);
      }
    });

    lastActiveRef.current = new Set(currentActive);
  }, [activeMidiSet, spawnHitParticles]);

  // Main Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep studio background
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, width, height);

      // Subtle background piano lane shading (black key lanes slightly darker)
      PIANO_KEYS_88.forEach((key) => {
        if (key.isBlack) {
          const bounds = getKeyBounds(key.midi);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.fillRect(bounds.x * width, 0, bounds.width * width, height);
        }
      });

      // Subtle octave dividers (C notes)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let m = 24; m <= 108; m += 12) {
        const bounds = getKeyBounds(m);
        const x = bounds.x * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Hit line at bottom
      ctx.strokeStyle = isWaiting ? '#f59e0b' : 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = isWaiting ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height - 2);
      ctx.lineTo(width, height - 2);
      ctx.stroke();

      // Render Falling Notes
      const visibleStart = currentTime - 0.2;
      const visibleEnd = currentTime + noteSpeed;
      const waitingIds = new Set(waitingNotes.map(n => n.id));

      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const noteEnd = note.time + note.duration;

        if (noteEnd < visibleStart || note.time > visibleEnd) {
          continue;
        }

        if (handSelection === 'right' && note.hand !== 'right') continue;
        if (handSelection === 'left' && note.hand !== 'left') continue;

        const bounds = getKeyBounds(note.midi);
        const x = bounds.x * width + 1;
        const w = Math.max(3, bounds.width * width - 2);

        const yBottom = height - ((note.time - currentTime) / noteSpeed) * height;
        const yTop = height - ((noteEnd - currentTime) / noteSpeed) * height;
        const noteHeight = Math.max(6, yBottom - yTop);

        const isCurrentlyWaiting = waitingIds.has(note.id);

        // Note Color Gradient
        const gradient = ctx.createLinearGradient(x, yTop, x, yBottom);
        if (note.hand === 'left') {
          gradient.addColorStop(0, '#1d4ed8');
          gradient.addColorStop(1, '#3b82f6');
        } else {
          gradient.addColorStop(0, '#047857');
          gradient.addColorStop(1, '#10b981');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(3, w / 2);
        ctx.roundRect(x, yTop, w, noteHeight, radius);
        ctx.fill();

        // Top highlight line for polished look
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 1, yTop, Math.max(1, w - 2), 1.5);

        // Waiting note highlight
        if (isCurrentlyWaiting) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Pulsing target dot at line
          ctx.strokeStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + w / 2, height - 2, Math.max(3, w / 2 + 3), 0, Math.PI * 2);
          ctx.stroke();
        } else if (note.time <= currentTime && noteEnd >= currentTime) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Hit particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [notes, currentTime, noteSpeed, isWaiting, waitingNotes, handSelection]);

  return (
    <div className="relative w-full flex-1 min-h-[300px] overflow-hidden bg-[#0a0b10]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Waiting Indicator Banner */}
      {isWaiting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#141620]/95 border border-amber-500/70 backdrop-blur-md rounded-md shadow-lg flex items-center space-x-2 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-amber-300 font-semibold tracking-wide">
            ETÜD: Tuşa basılması bekleniyor...
          </span>
        </div>
      )}
    </div>
  );
};
