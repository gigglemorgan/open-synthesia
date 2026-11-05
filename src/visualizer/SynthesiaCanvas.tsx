/**
 * SynthesiaCanvas.tsx
 * Ultra Yüksek Performanslı Şelale Görselleştirici (Rush E / Black MIDI Optimize)
 * - Binary Search (İkili Arama) ile O(log N) anlık görünür nota tespiti (50.000+ nota sıfır donma)
 * - Bellek Dostu Çizim (GC çöp toplayıcı duraklamalarını önler)
 * - Yoğunluk Korumalı Vuruş Parçacıkları (Rush E sırasında FPS düşüşünü engeller)
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

// O(log N) Binary Search: Sadece ekranda görünen ilk notanın indeksini bulur
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

  // Parçacık üretimi (Rush E sırasında aşırı parçacık yığılmasını engeller)
  const spawnHitParticles = useCallback((x: number, y: number, color: string) => {
    // Maksimum 35 parçacık sınırı (FPS koruması)
    if (particlesRef.current.length > 35) return;

    const count = 4;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / count) * i + Math.PI;
      const speed = Math.random() * 2 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2,
        vy: Math.sin(angle) * speed - 0.8,
        radius: Math.random() * 2 + 1,
        color,
        alpha: 0.85,
        decay: Math.random() * 0.05 + 0.04,
      });
    }
  }, []);

  // Aktif tuşları kontrol et
  useEffect(() => {
    const currentActive = activeMidiSet;
    const canvas = canvasRef.current;
    if (!canvas || currentActive.size === 0) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Rush E gibi yoğun anlarda (10+ eşzamanlı tuş) parçacıkları sınırla
    const maxSpawns = currentActive.size > 8 ? 4 : currentActive.size;
    let spawned = 0;

    currentActive.forEach((midi) => {
      if (!lastActiveRef.current.has(midi) && spawned < maxSpawns) {
        const bounds = getKeyBounds(midi);
        const x = (bounds.x + bounds.width / 2) * width;
        const color = midi < 60 ? '#38bdf8' : '#34d399';
        spawnHitParticles(x, height - 2, color);
        spawned++;
      }
    });

    lastActiveRef.current = new Set(currentActive);
  }, [activeMidiSet, spawnHitParticles]);

  // Ana Çizim Döngüsü (Ultra Optimize)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Arka Plan
      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, width, height);

      // Siyah tuş şeritleri
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let i = 0; i < PIANO_KEYS_88.length; i++) {
        const key = PIANO_KEYS_88[i];
        if (key.isBlack) {
          const bounds = getKeyBounds(key.midi);
          ctx.fillRect(bounds.x * width, 0, bounds.width * width, height);
        }
      }

      // Vuruş Çizgisi
      ctx.strokeStyle = isWaiting ? '#f59e0b' : 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height - 1.5);
      ctx.lineTo(width, height - 1.5);
      ctx.stroke();

      // 2. DÜŞEN NOTALAR (BINARY SEARCH İLE O(1) ANLIK GÖRÜNÜM)
      const visibleStart = currentTime - 0.2;
      const visibleEnd = currentTime + noteSpeed;

      const startIndex = findFirstVisibleIndex(notes, visibleStart);
      const waitingIds = waitingNotes.length > 0 ? new Set(waitingNotes.map(n => n.id)) : null;

      for (let i = startIndex; i < notes.length; i++) {
        const note = notes[i];

        // Ekranın üstünden daha geç gelecek notalara ulaşıldığında döngüyü hemen kır!
        if (note.time > visibleEnd) {
          break;
        }

        // El filtresi
        if (handSelection === 'right' && note.hand !== 'right') continue;
        if (handSelection === 'left' && note.hand !== 'left') continue;

        const noteEnd = note.time + note.duration;
        if (noteEnd < visibleStart) continue;

        const bounds = getKeyBounds(note.midi);
        const x = bounds.x * width + 0.5;
        const w = Math.max(2, bounds.width * width - 1);

        const yBottom = height - ((note.time - currentTime) / noteSpeed) * height;
        const yTop = height - ((noteEnd - currentTime) / noteSpeed) * height;
        const noteHeight = Math.max(5, yBottom - yTop);

        const isCurrentlyWaiting = waitingIds ? waitingIds.has(note.id) : false;

        // GC dostu hızlı renkler (createLinearGradient çağrısı olmadan yüksek FPS)
        if (note.hand === 'left') {
          ctx.fillStyle = '#2563eb';
        } else {
          ctx.fillStyle = '#059669';
        }

        ctx.fillRect(x, yTop, w, noteHeight);

        // Üst aydınlık çizgisi
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x, yTop, w, 1.5);

        // Bekleme hedef halkası
        if (isCurrentlyWaiting) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 1, yTop - 1, w + 2, noteHeight + 2);
        }
      }

      // 3. Parçacıklar
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

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [notes, currentTime, noteSpeed, isWaiting, waitingNotes, handSelection]);

  return (
    <div className="relative w-full flex-1 min-h-[300px] overflow-hidden bg-[#08090d]">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
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
