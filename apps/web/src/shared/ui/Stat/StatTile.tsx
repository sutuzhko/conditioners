import type { ReactNode } from 'react';

import styles from './StatTile.module.css';

/**
 * Плитка показателя в панели: подпись, число, чип изменения, пояснение
 * (issue #329).
 *
 * 🔴 Это не `StatList`. Тот — счётчик достижений витрины: он отсчитывает
 * число от нуля и живёт на первом экране. Здесь показатель за период, у него
 * есть направление изменения и пояснение, а отсчёта нет вовсе — в панели
 * анимированная цифра мешает сверять её с таблицей ниже. Общее у них только
 * слово «показатель», и один компонент на оба случая получился бы набором
 * взаимоисключающих флагов.
 *
 * 🔴 Компонент серверный: клиентского JS у него ноль. Число приходит готовым
 * из данных страницы (инвариант 1).
 */

/** Куда изменился показатель. Глиф и подпись чипа считаются отсюда. */
export type StatTrend = 'up' | 'down' | 'flat';

/**
 * Краска чипа. По умолчанию выводится из направления — рост зелёный, спад
 * красный, — но выбор остаётся за местом вызова: у отказов и просрочек рост
 * плохая новость, и зелёный чип на нём читается прямо наоборот.
 */
export type StatDeltaTone = 'success' | 'danger' | 'neutral';

const GLYPH: Readonly<Record<StatTrend, string>> = { up: '↑', down: '↓', flat: '=' };

const TONE: Readonly<Record<StatTrend, StatDeltaTone>> = {
  up: 'success',
  down: 'danger',
  flat: 'neutral',
};

/** Как направление называется словом: краску различает не всякий глаз. */
const TREND_WORD: Readonly<Record<StatTrend, string>> = {
  up: 'рост',
  down: 'спад',
  flat: 'без изменений',
};

export interface StatDelta {
  readonly trend: StatTrend;
  /** Само изменение: «+4», «−3», «0». Знак задаёт данные, а не компонент. */
  readonly value: string;
  readonly tone?: StatDeltaTone | undefined;
}

export interface StatTileProps {
  /** Подпись показателя — над числом. */
  readonly label: string;
  /** Число. Строкой: показатель бывает и «12 ч», и «1,4 млн». */
  readonly value: string;
  /** Хвост после числа: «₽», «шт». Отбивается от числа и набирается мельче. */
  readonly suffix?: string | undefined;
  readonly delta?: StatDelta | undefined;
  /** Пояснение под числом: за какой период, с чем сравнивается. */
  readonly note?: ReactNode | undefined;
  readonly className?: string | undefined;
}

export function StatTile({ label, value, suffix, delta, note, className }: StatTileProps) {
  /* 🔴 Плитка сама себе список описаний, а не пара `dt`/`dd` внутри чужого
     `dl`. Пара вне списка — невалидная разметка, и плитка, поставленная
     в одиночку (а так она и стоит в карточке раздела), давала бы именно её.
     Список из одного термина с двумя описаниями валиден и означает ровно то,
     что нарисовано: показатель, его значение и пояснение к нему. */
  return (
    <dl className={[styles.tile, className].filter(Boolean).join(' ')}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>
        {/* 🔴 Число и чип стоят в одной строке, но чип отжат `margin-left:
            auto`: его ширина меняется вместе со значением, и стоя перед
            числом или в центрированном ряду он двигал бы главную цифру
            плитки при каждом обновлении. Замер координаты — в StatTile.test. */}
        <span className={styles.number}>
          {value}
          {suffix === undefined ? null : <span className={styles.suffix}>{suffix}</span>}
        </span>
        {delta === undefined ? null : (
          <span className={[styles.delta, styles[delta.tone ?? TONE[delta.trend]]].join(' ')}>
            <span aria-hidden="true">{GLYPH[delta.trend]}</span>
            {/* Слово рядом с глифом: стрелка вверх на чёрно-белой печати и
                при нарушениях цветовосприятия остаётся стрелкой, а краска
                чипа пропадает. Видимого места оно не занимает. */}
            <span className="srOnly">{TREND_WORD[delta.trend]}</span>
            {delta.value}
          </span>
        )}
      </dd>
      {note === undefined ? null : <dd className={styles.note}>{note}</dd>}
    </dl>
  );
}

export interface StatTilesProps {
  readonly children: ReactNode;
  /** Имя ряда для озвучки, если рядом нет заголовка. */
  readonly label?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Ряд плиток. Четыре в ряд от 1200, две ниже: на 900–1199 четыре плитки
 * ужимаются до нечитаемых, а на телефоне остальные показатели уходят в свои
 * разделы, а не громоздятся на первом экране (issue #329).
 */
export function StatTiles({ children, label, className }: StatTilesProps) {
  return (
    <div
      className={[styles.tiles, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
