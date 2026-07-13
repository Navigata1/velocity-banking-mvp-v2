'use client';

import { useEffect, useRef } from 'react';

/* ──────────────────────────────────────────────────────────
   PARTICLE COLORS
   ────────────────────────────────────────────────────────── */

const RAINBOW = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

/* ──────────────────────────────────────────────────────────
   CONFETTI EXPLOSION (canvas-based for performance)
   ────────────────────────────────────────────────────────── */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  isStar: boolean;
}

export function ConfettiExplosion({ originX, originY, count = 40, duration = 2000, spread = 1, onDone }: {
  originX: number; originY: number; count?: number; duration?: number; spread?: number; onDone?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 6) * spread;
      particles.push({
        x: originX, y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 3,
        color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        opacity: 1,
        isStar: Math.random() > 0.6,
      });
    }

    const start = performance.now();
    let raf: number;

    function drawStar(c: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) c.moveTo(Math.cos(a) * size, Math.sin(a) * size);
        else c.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      c.closePath();
      c.fill();
      c.restore();
    }

    const c = ctx;
    const cv = canvas;
    function loop(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      c.clearRect(0, 0, cv.width, cv.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.rotation += p.rotationSpeed;
        p.opacity = 1 - progress;

        c.globalAlpha = p.opacity;
        c.fillStyle = p.color;

        if (p.isStar) {
          drawStar(c, p.x, p.y, p.size, p.rotation);
        } else {
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;

      if (progress < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        onDone?.();
      }
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [originX, originY, count, duration, spread, onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

/* ──────────────────────────────────────────────────────────
   GRAND FINALE — full-width raining confetti
   ────────────────────────────────────────────────────────── */

export function GrandFinale({ onDone }: { onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    // Spawn particles across the top
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 4,
        color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
        size: 3 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        isStar: Math.random() > 0.4,
      });
    }

    const start = performance.now();
    const duration = 3500;
    let raf: number;

    function drawStar(c: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        if (i === 0) c.moveTo(Math.cos(a) * size, Math.sin(a) * size);
        else c.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      c.closePath();
      c.fill();
      c.restore();
    }

    const c = ctx;
    const cv = canvas;
    function loop(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      c.clearRect(0, 0, cv.width, cv.height);

      const fadeStart = 0.7;
      const globalFade = progress > fadeStart ? 1 - (progress - fadeStart) / (1 - fadeStart) : 1;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (Math.random() - 0.5) * 0.1;
        p.rotation += p.rotationSpeed;

        c.globalAlpha = globalFade * 0.9;
        c.fillStyle = p.color;

        if (p.isStar) {
          drawStar(c, p.x, p.y, p.size, p.rotation);
        } else {
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.globalAlpha = 1;

      if (progress < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        onDone?.();
      }
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

