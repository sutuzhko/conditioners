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
 * Лента отзывов: бесконечный медленный ход, руками не двигается (ADR-124).
 *
 * 🔴 Прокрутка выключена совсем: `overflow-x: hidden` не отдаёт ленту ни
 * колесу, ни пальцу, ни полосе — двигает её только этот компонент. Лента
 * замкнута сама на себя дублем карточек: доехав до его начала, прокрутка
 * переносится на ширину первой копии, и человек этого не видит — под
 * курсором ровно то же самое. Края у такого содержимого нет: конец и есть
 * начало.
 *
 * 🔴 Ход сделан `scrollLeft`, а не анимацией `transform`. Программной
 * прокрутке всё равно, что overflow скрыт, зато браузер по-прежнему сам
 * доводит до видимости карточку, на которую ушёл фокус с клавиатуры —
 * с `transform` пришлось бы считать это руками.
 *
 * Карточки остаются в серверном HTML: компонент управляет прокруткой, а не
 * рисует содержимое (инвариант 1).
 */
export function ReviewsTrack({ label, drift = true, children }: ReviewsTrackProps) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const track = ref.current;
    if (track === null || !drift) return;

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

    let paused = false;
    let frame = 0;
    let last = 0;
    // дробная часть копится отдельно: scrollLeft округляется, и на медленной
    // скорости лента иначе стоит на месте
    let offset = 0;

    /**
     * Ширина одной копии ленты: от начала первой карточки до начала её
     * дубля. Пройдя это расстояние, лента показывает ровно то же самое, что
     * в начале, — значит, прокрутку можно перенести назад незаметно.
     *
     * Меряется каждый раз заново: ширина карточки зависит от ширины окна
     * (`min(370px, 82vw)`), и запомненное при монтировании значение врало бы
     * после поворота телефона.
     */
    const loopWidth = (): number => {
      const items = track.children;
      const half = items.length / 2;
      const first = items[0];
      const twin = items[half];
      if (!(first instanceof HTMLElement) || !(twin instanceof HTMLElement)) return 0;

      return twin.offsetLeft - first.offsetLeft;
    };

    /**
     * 🔴 Перенос идёт каждый кадр, а не только пока лента едет сама: до дубля
     * её доводит и фокус с клавиатуры, который браузер сам подкручивает к
     * нужной карточке.
     */
    const wrap = (): void => {
      /* Пока фокус внутри ленты, не переносим: браузер сам довёл карточку до
         видимости, и перенос увёл бы её обратно за край — человек с
         клавиатурой оказался бы на невидимой кнопке. */
      if (track.contains(document.activeElement)) return;

      const width = loopWidth();

      if (width > 0 && track.scrollLeft >= width) {
        track.scrollLeft -= width;
        return;
      }

      /* Запасной путь: копия уже экрана — так бывает на очень широком мониторе
         при небольшом числе отзывов. Переносить нечего, показывать в этот
         момент нечего тоже, и лента возвращается в начало, как делала раньше.
         Рывок виден, но он лучше ленты, вставшей у края навсегда. */
      const limit = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= limit - 1) track.scrollLeft = 0;
    };

    const step = (time: number): void => {
      const delta = last === 0 ? 0 : (time - last) / 1000;
      last = time;

      if (!paused && track.scrollWidth > track.clientWidth) {
        offset += SPEED * delta;
        const whole = Math.floor(offset);
        if (whole > 0) {
          offset -= whole;
          track.scrollLeft += whole;
        }
      }

      wrap();
      frame = requestAnimationFrame(step);
    };

    const start = (): void => {
      if (frame !== 0) return;
      // отсчёт времени с нуля: иначе первый кадр после паузы получил бы
      // дельту за всё время простоя и лента прыгала бы вперёд
      last = 0;
      offset = 0;
      frame = requestAnimationFrame(step);
    };

    const stop = (): void => {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // экономию движения включают и не уходя со страницы (та же панель ОС):
    // подписка останавливает ленту сразу, а не при следующем маунте
    const sync = (): void => {
      if (calm.matches) stop();
      else start();
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
    // палец: пока он на ленте, она стоит — читают, а не смотрят, как едет
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('touchend', resume, { passive: true });
    calm.addEventListener('change', sync);
    sync();

    return () => {
      stop();
      calm.removeEventListener('change', sync);
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
    >
      {children}
    </ul>
  );
}
