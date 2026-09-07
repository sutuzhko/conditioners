import type Link from 'next/link';
import type { ComponentProps } from 'react';

import styles from './Tabs.module.css';

/**
 * Обличье вкладки — одно из двух, что рисует макет (issue #584, ADR-307).
 *
 * `underline` — заказы, отзывы, статьи, карточки клиента, монтажника и наряда:
 * подчёркнутая подпись на линии раздела (`design/admin/_base.css`, `.tabsrow`).
 * `capsule` — сводка панели: три положения в общем треке (`.seg`).
 *
 * Различие смысловое, а не декоративное. Подчёркиванием отмечена **часть
 * одного экрана или стопка одного списка**, капсулами — **вид, в котором один
 * и тот же экран показывают целиком**. Третьего обличья нет: чип с рамкой,
 * стоявший у отзывов и статей, был самодеятельностью — макет рисует их
 * подчёркиванием наравне с заказами (`ContentTabs.body.html`).
 */
export type TabAppearance = 'underline' | 'capsule';

/** Адрес вкладки — то же, что принимает `next/link`. */
export type TabHref = ComponentProps<typeof Link>['href'];

/**
 * Счётчик у подписи: «Активные 7», «Новые 2» (issue #585).
 *
 * 🔴 Число без озвучки не бывает — отсюда пара, а не одиночное поле. «Активные
 * 7» читалка объявляет как «Активные семь», и это не значит ничего: семь чего?
 * Существительное знает раздел, а не кит, поэтому фразу приносит он —
 * «Активные: 7 нарядов». Тип не даёт передать число, забыв её.
 *
 * 🔴 Строка, а не только число: чеклист выезда отвечает не «девять», а «4 из
 * 9», и одним числом это не сказать — девять пунктов, из которых собран один,
 * и девять собранных суть разные состояния сборов (issue #598).
 */
export type TabCount =
  | { readonly count: number | string; readonly countLabel: string }
  | { readonly count?: undefined; readonly countLabel?: undefined };

/** Общая часть вкладки любого обличья: ключ адреса, подпись и счётчик. */
export type TabBase<T extends string> = {
  /** Ключ вкладки — тот же, что в словаре `shared/config/admin-tabs`. */
  readonly key: T;
  /** Подпись на экране. Словарь описывает адрес, а не текст (ADR-255). */
  readonly title: string;
} & TabCount;

export function stripClassName(appearance: TabAppearance, scroll: boolean): string {
  return [
    styles.strip,
    appearance === 'underline' ? styles.stripUnderline : styles.stripCapsule,
    scroll ? styles.scroll : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export function rowClassName(appearance: TabAppearance): string {
  return [styles.row, appearance === 'underline' ? styles.rowUnderline : styles.rowCapsule].join(
    ' ',
  );
}

export function tabClassName(appearance: TabAppearance, current: boolean): string {
  const own =
    appearance === 'underline'
      ? [styles.tabUnderline, current ? styles.currentUnderline : null]
      : [styles.tabCapsule, current ? styles.currentCapsule : null];

  return [styles.tab, ...own].filter(Boolean).join(' ');
}

/**
 * Подпись вкладки со счётчиком.
 *
 * Ноль показывается наравне с остальными числами: «Техника 0» отвечает на
 * вопрос «есть ли там что-нибудь», а пустое место — нет.
 */
export function TabLabel({ item }: { readonly item: TabBase<string> }) {
  const { title, count, countLabel } = item;
  if (count === undefined) return title;

  return (
    <>
      {title}
      <span className={styles.count} aria-hidden="true">
        {count}
      </span>
      <span className="srOnly">{countLabel}</span>
    </>
  );
}
