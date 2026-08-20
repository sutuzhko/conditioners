'use client';

import { useEffect, useState } from 'react';

/** Длительность и кривая — из макета: 1.2 с, ease-out cubic (DESIGN_BRIEF §7). */
const DEFAULT_DURATION_MS = 1200;

type CountUpOptions = {
  /** Длительность анимации, мс. */
  readonly durationMs?: number;
  /** Пока `false` — счётчик стоит на конечном значении и не анимируется. */
  readonly enabled?: boolean;
  /** Значение, с которого начинается отсчёт. */
  readonly from?: number;
};

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Анимация счётчика цифр (первый экран, «Почему нас выбирают»).
 *
 * Начальное состояние — уже конечное число: серверный HTML обязан содержать
 * настоящую цифру, иначе робот увидит ноль (инвариант 1). Отсчёт с нуля
 * запускается после монтирования и только если пользователь не просил
 * убрать движение.
 */
export function useCountUp(target: number, options: CountUpOptions = {}): number {
  const { durationMs = DEFAULT_DURATION_MS, enabled = true, from = 0 } = options;
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (!enabled || durationMs <= 0 || prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    let startedAt: number | null = null;
    setValue(from);

    const step = (now: number): void => {
      startedAt ??= now;
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setValue(Math.round(from + (target - from) * easeOutCubic(progress)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, enabled, from]);

  return value;
}
