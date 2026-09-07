'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

import {
  TabLabel,
  rowClassName,
  stripClassName,
  tabClassName,
  type TabAppearance,
  type TabBase,
} from './common';
import styles from './Tabs.module.css';

export type TabPanelItem<T extends string> = TabBase<T> & {
  /** Содержимое вкладки — готовое: разметку собирает страница. */
  readonly panel: ReactNode;
};

export interface TabPanelsProps<T extends string> {
  readonly items: readonly TabPanelItem<T>[];
  /** Открытая вкладка: её разобрала страница на сервере (issue #340). */
  readonly active: T;
  /** Имя ленты для озвучки: «Карточка клиента», «Работа с нарядом». */
  readonly label: string;
  /** Приставка к `id` панелей: на странице лент может быть больше одной. */
  readonly idPrefix: string;
  readonly appearance?: TabAppearance | undefined;
  readonly className?: string | undefined;
}

/**
 * Вкладки одной карточки: данные всех уже пришли одним запросом (issue #584).
 *
 * 🔴 Адрес меняется `history.pushState`, а не переходом роутера (ADR-256).
 * Переход заставил бы сервер собрать карточку заново — клиента, его наряды,
 * технику, — ради содержимого, которое уже лежит в разметке. Платил бы за это
 * монтажник у машины, которому вкладку нужно просто посмотреть. Next такой
 * адрес подхватывает: `useSearchParams` обновляется и на нашем переключении, и
 * на «назад», поэтому «назад» возвращает на предыдущую вкладку, а не
 * выбрасывает из карточки (issue #342, #587).
 *
 * Панели рисуются все сразу и прячутся атрибутом `hidden`, а не
 * размонтируются: переключение вкладки не должно терять наполовину заполненный
 * отчёт о выезде и выбранный файл документа. Прокрутка не сбрасывается
 * (ADR-258): адрес правится, а не переоткрывается.
 *
 * Клавиатура работает как положено вкладкам: стрелки переводят фокус, Home и
 * End — к краям.
 */
export function TabPanels<T extends string>({
  items,
  active,
  label,
  idPrefix,
  appearance = 'underline',
  className,
}: TabPanelsProps<T>) {
  const params = useSearchParams();
  const buttons = useRef<Map<T, HTMLButtonElement>>(new Map());

  /* Пока браузер не тронул адрес, верно то, что разобрал сервер: иначе возврат
     на первую вкладку вернул бы ту, с которой карточку открыли. Значение из
     адреса берётся, только если оно и правда одна из вкладок, — мусор в
     параметре оставляет открытой ту, что выбрал сервер (issue #341). */
  const fromUrl = params.get('tab');
  const current = items.find((item) => item.key === fromUrl)?.key ?? active;

  /* 🔴 Пять вкладок в строку на 390 не помещаются: лента прокручивается, и
     открытую нужно подвезти к глазам. Иначе ссылка на «Историю» открывает
     карточку, у которой видно «Наряд» и «Расход», а подсвеченной вкладки нет
     вовсе. Прокручивается только лента: `block: 'nearest'` не даёт странице
     прыгнуть к вкладкам с самого верха карточки. */
  useEffect(() => {
    buttons.current.get(current)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current]);

  /* 🔴 Адрес строится из текущего, а не из `usePathname` с параметрами: в
     витрине путь роутера подменён на «/», и переключение вкладки внутри
     истории переписало бы адрес кадра, потеряв `id` и прочие параметры. Здесь
     меняется ровно один параметр того адреса, который открыт. */
  const write = (tab: T, mode: 'push' | 'replace'): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);

    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };

  /* 🔴 Стрелки водят фокус и открывают вкладку, но записи в историю не
     оставляют: иначе обход ленты кладёт туда столько записей, сколько в ней
     вкладок, и «назад» перестаёт выводить из карточки (issue #342). */
  const focus = (index: number): void => {
    const item = items[index];
    if (item === undefined) return;

    write(item.key, 'replace');
    buttons.current.get(item.key)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = items.length - 1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focus(index === last ? 0 : index + 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focus(index === 0 ? last : index - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focus(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focus(last);
    }
  };

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div className={stripClassName(appearance, true)}>
        <div className={rowClassName(appearance)} role="tablist" aria-label={label}>
          {items.map((item, index) => (
            <button
              key={item.key}
              ref={(node) => {
                if (node === null) buttons.current.delete(item.key);
                else buttons.current.set(item.key, node);
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${item.key}`}
              className={tabClassName(appearance, current === item.key)}
              aria-selected={current === item.key}
              aria-controls={`${idPrefix}-panel-${item.key}`}
              /* Из ленты выпадают все, кроме выбранной: Tab уводит на панель, а
                 между вкладками ходят стрелками. */
              tabIndex={current === item.key ? 0 : -1}
              onClick={() => write(item.key, 'push')}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <TabLabel item={item} />
            </button>
          ))}
        </div>
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          role="tabpanel"
          id={`${idPrefix}-panel-${item.key}`}
          className={styles.panel}
          aria-labelledby={`${idPrefix}-tab-${item.key}`}
          hidden={current !== item.key}
          tabIndex={0}
        >
          {item.panel}
        </div>
      ))}
    </div>
  );
}
