'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import styles from './ReviewsTrack.module.css';

/** Пикселей в секунду: медленнее чтения, чтобы строку можно было дочитать. */
const SPEED = 22;

export interface ReviewsTrackProps {
  readonly label: string;
  /**
   * Ехать ли самой. Выключается, когда отзывов нет: двигать заготовки —
   * движение ради движения, а приглашение в середине уезжало бы от глаз.
   */
  readonly drift?: boolean | undefined;
  readonly children: ReactNode;
}

/**
 * Лента отзывов: ручная прокрутка плюс медленный ход сам по себе.
 *
 * 🔴 Ход сделан прокруткой, а не анимацией `transform`. Анимация двигала бы
 * дорожку под пальцем: браузер прокручивает контейнер, а анимация возвращает
 * его обратно — жест перестаёт работать. Здесь же лента просто прокручивается
 * сама, и любое действие человека её останавливает.
 *
 * Карточки остаются в серверном HTML: компонент управляет прокруткой, а не
 * рисует содержимое (инвариант 1).
 */
export function ReviewsTrack({ label, drift = true, children }: ReviewsTrackProps) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const track = ref.current;
    if (track === null || !drift) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let paused = false;
    let frame = 0;
    let last = 0;
    // дробная часть копится отдельно: scrollLeft округляется, и на медленной
    // скорости лента иначе стоит на месте
    let offset = 0;

    const step = (time: number): void => {
      const delta = last === 0 ? 0 : (time - last) / 1000;
      last = time;

      if (!paused && track.scrollWidth > track.clientWidth) {
        offset += SPEED * delta;
        const whole = Math.floor(offset);
        if (whole > 0) {
          offset -= whole;
          const limit = track.scrollWidth - track.clientWidth;
          // дойдя до конца, начинаем сначала: список конечный, и упереться
          // в край — значит остановиться навсегда
          track.scrollLeft = track.scrollLeft >= limit - 1 ? 0 : track.scrollLeft + whole;
        }
      }

      frame = requestAnimationFrame(step);
    };

    const pause = (): void => {
      paused = true;
    };
    const resume = (): void => {
      paused = false;
    };

    track.addEventListener('pointerenter', pause);
    track.addEventListener('pointerleave', resume);
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', resume);
    // палец: пока его не убрали, лента принадлежит человеку
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('touchend', resume, { passive: true });
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener('pointerenter', pause);
      track.removeEventListener('pointerleave', resume);
      track.removeEventListener('focusin', pause);
      track.removeEventListener('focusout', resume);
      track.removeEventListener('touchstart', pause);
      track.removeEventListener('touchend', resume);
    };
  }, [drift]);

  return (
    <ul
      ref={ref}
      className={`${styles.track} ${drift ? styles.live : styles.static}`}
      aria-label={label}
      /* Фокус нужен только прокручиваемой ленте: у неподвижной он был бы
         остановкой на элементе, с которым нечего делать. */
      tabIndex={drift ? 0 : undefined}
    >
      {children}
    </ul>
  );
}
