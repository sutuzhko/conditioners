'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { resolvePanelTab } from '@/shared/config/admin-tabs';

import styles from './PanelTabs.module.css';

/**
 * Набор вкладок — непустой кортеж ключей адреса: тот же, что лежит в словаре
 * `shared/config/admin-tabs`. Подписи приходят отдельно: словарь описывает
 * адрес, а не текст на экране (ADR-255).
 */
export type PanelTabKeys<T extends string> = readonly [T, ...T[]];

/**
 * Лента вкладок панели — одна на все разделы (issue #350, #351, #352).
 *
 * 🔴 Живёт в слое приложения, а не в фиче. Вкладки нужны трём разделам сразу
 * — карточке клиента, карточке монтажника и складу, — а импорт вбок между
 * слайсами одного слоя запрещён правилом зависимостей. Место такому
 * примитиву — в `shared/ui`, и туда он и переедет, когда кит откроется; до
 * тех пор общий предок трёх разделов — сам раздел панели.
 *
 * Вид — подчёркивание, а не пилюля, и это различие смысловое: пилюлями в
 * панели отмечен **фильтр списка** (заявки, стопки заказов, модерация), а
 * подчёркиванием — **часть одного экрана**. Карточка наряда так и собрана.
 */

/* ---------- Вкладки, переключаемые без перехода ---------- */

export interface PanelTabsProps<T extends string> {
  /** Открытая вкладка: её разобрала страница на сервере (issue #340). */
  readonly active: T;
  readonly tabs: PanelTabKeys<T>;
  /** Подпись вкладки на экране: её знает раздел, а не словарь адресов. */
  /**
   * Подписи вкладок. 🔴 Словарём, а не функцией: функция не переживает
   * границу сервер→клиент, а лист клиентский — он правит адрес и водит фокус.
   */
  readonly titles: Readonly<Record<T, string>>;
  /** Имя ленты для озвучки: «Карточка клиента», «Склад». */
  readonly label: string;
  /** Приставка к `id` панелей: на странице лент может быть больше одной. */
  readonly idPrefix: string;
  /** Содержимое вкладок — готовое: разметку собирает страница. */
  readonly panels: Readonly<Record<T, ReactNode>>;
  /**
   * Счётчики у подписей: «Заказы 3», «Техника 2» (issue #602, макет
   * `CardTabs.png`).
   *
   * 🔴 Число сообщает, есть ли за вкладкой что-нибудь, — до того, как на неё
   * нажали. Пустая вкладка, о которой узнаёшь только открыв её, стоит одного
   * лишнего нажатия каждый раз; на карточке из трёх вкладок это заметно.
   *
   * Ноль показывается наравне с остальными числами: «Техника 0» отвечает на
   * вопрос, а пустое место — нет.
   */
  readonly counts?: Partial<Readonly<Record<T, number>>> | undefined;
}

/**
 * Вкладки одной карточки: данные всех уже пришли одним запросом страницы.
 *
 * 🔴 Адрес меняется `history.pushState`, а не переходом роутера (ADR-256).
 * Переход заставил бы сервер собрать карточку заново — клиента, его наряды,
 * технику, — ради содержимого, которое уже лежит в разметке. Панели прячутся
 * атрибутом `hidden` и не размонтируются: переключение вкладки не должно
 * терять наполовину заполненную форму.
 *
 * Прокрутка не сбрасывается (ADR-258): адрес правится, а не переоткрывается.
 */
export function PanelTabs<T extends string>({
  active,
  tabs,
  titles,
  label,
  idPrefix,
  panels,
  counts,
}: PanelTabsProps<T>) {
  const params = useSearchParams();
  const buttons = useRef<Map<T, HTMLButtonElement>>(new Map());

  const keys = tabs;

  /* Пока браузер не тронул адрес, верно то, что разобрал сервер: `has`, а не
     `get`, — иначе возврат на первую вкладку вернул бы ту, с которой карточку
     открыли. */
  const current = params.has('tab') ? resolvePanelTab(keys, params.get('tab')) : active;

  /* 🔴 Адрес строится из текущего, а не из `usePathname` с параметрами: в
     витрине путь роутера подменён на «/», и переключение вкладки внутри
     истории переписало бы адрес кадра. Здесь меняется ровно один параметр. */
  const write = (tab: T, mode: 'push' | 'replace'): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);

    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };

  /* 🔴 Стрелки водят фокус и открывают вкладку, но записи в историю не
     оставляют: иначе обход ленты кладёт туда столько записей, сколько в ней
     вкладок, и «назад» перестаёт выводить из карточки (issue #342). */
  const focus = (tab: T): void => {
    write(tab, 'replace');
    buttons.current.get(tab)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = keys.length - 1;
    const first = keys[0];

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(keys[index === last ? 0 : index + 1] ?? first);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(keys[index === 0 ? last : index - 1] ?? first);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focus(first);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focus(keys[last] ?? first);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(node) => {
              if (node === null) buttons.current.delete(tab);
              else buttons.current.set(tab, node);
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab}`}
            className={[styles.tab, current === tab ? styles.current : null]
              .filter(Boolean)
              .join(' ')}
            aria-selected={current === tab}
            aria-controls={`${idPrefix}-panel-${tab}`}
            /* Из ленты выпадают все, кроме выбранной: Tab уводит на панель, а
               между вкладками ходят стрелками. */
            tabIndex={current === tab ? 0 : -1}
            onClick={() => write(tab, 'push')}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {titles[tab]}

            {counts?.[tab] === undefined ? null : (
              <span className={styles.count}>{counts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`${idPrefix}-panel-${tab}`}
          className={styles.panel}
          aria-labelledby={`${idPrefix}-tab-${tab}`}
          hidden={current !== tab}
          tabIndex={0}
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  );
}
