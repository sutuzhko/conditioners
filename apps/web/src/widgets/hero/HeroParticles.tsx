'use client';

import { useEffect, useRef } from 'react';

import styles from './HeroParticles.module.css';

/** Сколько частиц рисуем. В макете 48; 32 достаточно, а кадр дешевле. */
const COUNT = 32;

/** Ниже этой ширины фон выключен — правило деградации из DESIGN_BRIEF §6. */
const MIN_WIDTH_PX = 900;

/** Ретина удваивает пиксели, дальше расти незачем: это фон, а не фотография. */
const MAX_DPR = 2;

type Particle = { x: number; y: number; r: number; speed: number; sway: number; phase: number };

function seed(width: number, height: number): Particle[] {
  return Array.from({ length: COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 2.6 + 0.6,
    speed: Math.random() * 0.35 + 0.12,
    sway: Math.random() * 0.7 + 0.2,
    phase: Math.random() * Math.PI * 2,
  }));
}

/**
 * Живой фон первого экрана — декорация и ничего больше.
 *
 * 🔴 Ограничения жёсткие (DESIGN_BRIEF §6 и §7, бюджет из CLAUDE.md):
 * рисование стартует после гидратации и не задерживает первый кадр; фон
 * выключен на экранах уже 900px и при `prefers-reduced-motion: reduce`;
 * canvas не участвует в измерении LCP (кандидатом на LCP он не является) и
 * не ловит указатель.
 *
 * Цвет берётся из токена `--accent-ink` через `getComputedStyle`, а не зашит
 * числом: правило «цвета только из токенов» не отменяется тем, что рисует JS.
 */
export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    // matchMedia нет в jsdom и в старых движках: без него декорация не включается
    if (!canvas || !host || !ctx || typeof window.matchMedia !== 'function') return;

    const wide = window.matchMedia(`(min-width: ${MIN_WIDTH_PX}px)`);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    let particles: Particle[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let color = '';

    const readColor = (): string =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim();

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = seed(width, height);
    };

    const draw = (): void => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;

      for (const p of particles) {
        p.y -= p.speed;
        p.phase += 0.012;
        p.x += Math.sin(p.phase) * p.sway * 0.35;
        if (p.y < -6) {
          p.y = height + 6;
          p.x = Math.random() * width;
        }
        ctx.globalAlpha = 0.07 + p.r * 0.05;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    const stop = (): void => {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
      ctx.clearRect(0, 0, width, height);
    };

    const start = (): void => {
      if (frame !== 0) return;
      color = readColor();
      resize();
      frame = requestAnimationFrame(draw);
    };

    const sync = (): void => {
      if (wide.matches && !calm.matches) start();
      else stop();
    };

    const onResize = (): void => {
      if (frame !== 0) resize();
    };

    // тему меняет атрибут на <html>: перечитываем цвет, а не считываем его в кадре
    const themeWatcher = new MutationObserver(() => {
      color = readColor();
    });
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    wide.addEventListener('change', sync);
    calm.addEventListener('change', sync);
    window.addEventListener('resize', onResize);
    sync();

    return () => {
      stop();
      themeWatcher.disconnect();
      wide.removeEventListener('change', sync);
      calm.removeEventListener('change', sync);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
