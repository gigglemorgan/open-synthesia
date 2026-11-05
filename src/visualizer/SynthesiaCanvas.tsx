/**
 * SynthesiaCanvas.tsx
 * 60+ FPS Synthesia Şelale (Falling Notes) Görselleştirici
 * - Sol el (Mavi) ve Sağ el (Yeşil) renk ayrımı
 * - Gerçekçi tuş hizalaması ve parlama efektleri
 * - Tuşa basıldığında vuruş parçacıkları (particle burst)
 * - Bekleme modu hedef halkaları
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { VisualNote, HandSelection } from '../types';
import { getKeyBounds } from './pianoLayout';

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
  noteSpeed?: number; // Görünür zaman aralığı (saniye, varsayılan 2.5s)
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
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / count) * i + Math.PI; // Upward burst
      const speed = Math.random() * 3 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed - 1.5,
        radius: Math.random() * 3 + 1.5,
        color,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02,
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
      // Resize handling for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#0b0d13';
      ctx.fillRect(0, 0, width, height);

      // Subtle vertical lane dividers for octaves
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
      ctx.strokeStyle = isWaiting ? 'rgba(245, 158, 11, 0.8)' : 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = 2;
      ctx.shadowColor = isWaiting ? '#f59e0b' : '#6366f1';
      ctx.shadowBlur = isWaiting ? 15 : 6;
      ctx.beginPath();
      ctx.moveTo(0, height - 2);
      ctx.lineTo(width, height - 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Render Falling Notes
      const visibleStart = currentTime - 0.2;
      const visibleEnd = currentTime + noteSpeed;

      const waitingIds = new Set(waitingNotes.map(n => n.id));

      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const noteEnd = note.time + note.duration;

        // Skip notes outside visible window
        if (noteEnd < visibleStart || note.time > visibleEnd) {
          continue;
        }

        // Hand filter check
        if (handSelection === 'right' && note.hand !== 'right') continue;
        if (handSelection === 'left' && note.hand !== 'left') continue;

        const bounds = getKeyBounds(note.midi);
        const x = bounds.x * width + 1;
        const w = Math.max(3, bounds.width * width - 2);

        // Calculate Y:
        // note.time === currentTime means note bottom touches (height - 2)
        const yBottom = height - ((note.time - currentTime) / noteSpeed) * height;
        const yTop = height - ((noteEnd - currentTime) / noteSpeed) * height;
        const noteHeight = Math.max(8, yBottom - yTop);

        const isCurrentlyWaiting = waitingIds.has(note.id);

        // Note Color Gradient
        const gradient = ctx.createLinearGradient(x, yTop, x, yBottom);
        if (note.hand === 'left') {
          // Sol El: Mavi Tonları
          gradient.addColorStop(0, '#2563eb');
          gradient.addColorStop(1, '#60a5fa');
        } else {
          // Sağ El: Zümrüt Yeşili
          gradient.addColorStop(0, '#059669');
          gradient.addColorStop(1, '#34d399');
        }

        // Draw note rectangle with rounded corners
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(4, w / 2);
        ctx.roundRect(x, yTop, w, noteHeight, radius);
        ctx.fill();

        // Border / Glow for active or waiting note
        if (isCurrentlyWaiting) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Target Pulsing Ring at Hit Line
          ctx.strokeStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + w / 2, height - 2, (w / 2) + 4, 0, Math.PI * 2);
          ctx.stroke();
        } else if (note.time <= currentTime && noteEnd >= currentTime) {
          // Currently playing note glow
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Update & Draw Hit Particles
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
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
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
    <div className="relative w-full flex-1 min-h-[300px] overflow-hidden bg-[#0b0d13]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Waiting Indicator Banner */}
      {isWaiting && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-amber-500/20 border border-amber-500/50 backdrop-blur-md rounded-full shadow-2xl flex items-center space-x-2 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-amber-300 font-semibold text-sm">
            Etüd Bekleme: Sarı ile parlayan tuş(lar)a basmanız bekleniyor...
          </span>
        </div>
      )}
    </div>
  );
};
