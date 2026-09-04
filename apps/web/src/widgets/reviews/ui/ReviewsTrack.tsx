'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { reviewsContent as t } from '../content';
import styles from './ReviewsTrack.module.css';

/** Пикселей в секунду: медленнее чтения, чтобы строку можно было дочитать. */
const SPEED = 22;

/**
 * 🔴 С этой ширины отзывы выложены лентой, ниже — колонкой и сеткой
 * (issue #274). Запрос повторяет порог из `ReviewsTrack.module.css`: лента
 * живёт в CSS, а скрипт обязан знать, есть ли она сейчас, — иначе он двигал
 * бы прокрутку у сетки и рисовал кнопку остановки над неподвижными
 * карточками.
 */
const RIBBON = '(min-width: 1200px)';

export interface ReviewsTrackProps {
  /** Нужен кнопке раскрытия: она управляет этим списком (`aria-controls`). */
  readonly id: string;
  readonly label: string;
  /**
   * Ехать ли самой. Выключается, когда отзывов мало: двигать заготовки —
   * движение ради движения.
   */
  readonly drift?: boolean | undefined;
  /**
   * Показаны ли только первые карточки. Скрытые остаются в разметке и
   * гасятся стилем (ADR-195): робот видит раздел целиком.
   */
  readonly clipped: boolean;
  readonly children: ReactNode;
}

/**
 * Список отзывов: сетка до 1200px и бесконечная лента дальше (issue #274,
 * ADR-124).
 *
 * 🔴 Раскладку выбирает CSS, а не скрипт: карточки приходят в HTML готовыми
 * и стоят на своих местах до единой строки JavaScript (инвариант 1). Скрипт
 * знает про ширину ровно затем, чтобы не двигать то, что не лента.
 *
 * 🔴 Пока лента едет, прокрутка выключена: `overflow-x: hidden` не отдаёт её
 * ни колесу, ни пальцу, ни полосе — двигает её только этот компонент. Лента
 * замкнута сама на себя дублем карточек: доехав до его начала, прокрутка
 * переносится на ширину первой копии, и человек этого не видит — под
 * курсором ровно то же самое.
 *
 * 🔴 Как только лента встала — своей кнопкой или по `prefers-reduced-motion`,
 * — прокрутка возвращается, и это не удобство, а условие доступности.
 * Скрытый overflow у остановленной ленты означал, что отзывы правее первого
 * экрана недостижимы вовсе: в HTML они есть и робот их видит, а прочитать их
 * человек, попросивший меньше движения, не может ничем.
 *
 * 🔴 Кнопка паузы — требование WCAG 2.2.2 «Pause, Stop, Hide»: содержимое,
 * которое стартует само и движется дольше пяти секунд, обязано иметь
 * механизм остановки. Остановка по наведению и касанию (ниже) им не
 * считается: у человека с телефона указателя нет, а удерживать палец на
 * ленте, чтобы читать, — это не механизм, а неудобство.
 *
 * 🔴 Ход сделан `scrollLeft`, а не анимацией `transform`. Программной
 * прокрутке всё равно, что overflow скрыт, зато браузер по-прежнему сам
 * доводит до видимости карточку, на которую ушёл фокус с клавиатуры —
 * с `transform` пришлось бы считать это руками.
 */
export function ReviewsTrack({ id, label, drift = true, clipped, children }: ReviewsTrackProps) {
  const ref = useRef<HTMLUListElement>(null);

  /**
   * Остановлена ли лента решением человека. Отдельно от паузы по наведению:
   * та живёт внутри эффекта и снимается сама, а эта держится до второго
   * нажатия и меняет саму природу ленты — из едущей в листаемую.
   *
   * 🔴 Экономию движения сюда не сводим. `prefers-reduced-motion` — это
   * настройка системы, и её состояние читается у системы, а не хранится
   * копией: человек включает её и выключает, не уходя со страницы.
   */
  const [stopped, setStopped] = useState(false);

  /**
   * Попросил ли меньше движения сам человек — настройкой системы.
   *
   * 🔴 Отдельно от `stopped`, потому что от этого зависит, нужна ли кнопка
   * вовсе: WCAG 2.2.2 требует механизм остановки у **движущегося**
   * содержимого. Лента, которую уже остановила система, не движется — и
   * кнопка «Остановить ленту» рядом с ней не делает ничего.
   */
  const [calm, setCalm] = useState(false);

  /**
   * Лежат ли карточки лентой прямо сейчас. На сервере — нет: там ширины окна
   * не существует, а разметка обязана совпасть с первым кадром клиента.
   * Кнопка остановки появляется вторым кадром, и это честно — до
   * JavaScript останавливать нечего.
   */
  const [ribbon, setRibbon] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(RIBBON);
    const sync = (): void => setRibbon(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const track = ref.current;
    if (track === null || !drift || !ribbon) return;

    const calmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

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
     * Меряется каждый раз заново: ширина карточки зависит от ширины окна,
     * и запомненное при монтировании значение врало бы после поворота
     * телефона.
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

    /**
     * Экономию движения включают и не уходя со страницы (та же панель ОС):
     * подписка останавливает ленту сразу, а не при следующем маунте.
     *
     * Ход прекращают обе причины — и настройка системы, и кнопка, — но
     * наружу отдаётся только первая: от неё зависит, нужна ли кнопка вовсе.
     */
    const sync = (): void => {
      if (calmQuery.matches || stopped) stop();
      else start();
      setCalm(calmQuery.matches);
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
    calmQuery.addEventListener('change', sync);
    sync();

    return () => {
      stop();
      calmQuery.removeEventListener('change', sync);
      track.removeEventListener('pointerenter', pause);
      track.removeEventListener('pointerleave', resume);
      track.removeEventListener('focusin', pause);
      track.removeEventListener('focusout', resume);
      track.removeEventListener('touchstart', pause);
      track.removeEventListener('touchend', resume);
    };
  }, [drift, ribbon, stopped]);

  /* Лента стоит по любой из двух причин, и от этого зависит одно: отдана ли
     прокрутка человеку. Кто именно её остановил, разметке безразлично. */
  const still = calm || stopped;

  /* Ход есть только там, где есть лента. Ниже 1200 карточки лежат сеткой:
     двигать нечего, останавливать нечего, и кнопка там не появляется. */
  const moving = drift && ribbon && !still;

  const listClass = [
    styles.list,
    clipped ? styles.clipped : null,
    drift ? styles.live : null,
    drift && still ? styles.scrollable : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrap}>
      {/* 🔴 Кнопки нет, когда движения и так нет: система уже попросила покоя
          или лента ещё не собрана — «Остановить ленту» рядом с неподвижными
          карточками не делает ничего. Кнопка стоит над лентой, а не поверх
          неё: лента идёт от края до края, и накрыть ею карточку — значит
          закрыть отзыв ради кнопки. */}
      {drift && ribbon && !calm ? (
        <button
          type="button"
          className={styles.switch}
          onClick={() => setStopped((was) => !was)}
          /* Состояние объявляется голосом: `aria-pressed` говорит, нажата ли
             кнопка, а подпись — что случится при следующем нажатии. */
          aria-pressed={stopped}
        >
          {stopped ? t.resumeTrack : t.pauseTrack}
        </button>
      ) : null}

      <ul ref={ref} id={id} className={listClass} aria-label={label}>
        {children}
      </ul>

      {/* 🔴 Смена природы ленты объявляется, а не только показывается полосой
          прокрутки: человек, который остановил ленту с клавиатуры, полосы не
          видит. `role="status"` доносит это без перехвата фокуса. */}
      <p className={styles.hint} role="status">
        {moving || !ribbon || !drift ? '' : t.pausedHint}
      </p>
    </div>
  );
}
