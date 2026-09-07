import Link from 'next/link';

import {
  TabLabel,
  rowClassName,
  stripClassName,
  tabClassName,
  type TabAppearance,
  type TabBase,
  type TabHref,
} from './common';

export type TabLinkItem<T extends string> = TabBase<T> & {
  /**
   * Куда ведёт вкладка. Адрес собирает раздел — он же знает свои фильтры:
   * период и поиск переезжают вместе со стопкой.
   *
   * 🔴 Адреса нет у заготовки раздела: `loading.tsx` параметров адреса не
   * получает, и вести ему некуда. Такая вкладка рисуется неподвижной — не
   * ссылкой и не кнопкой, чтобы по ней нельзя было нажать.
   */
  readonly href?: TabHref | undefined;
};

export interface TabLinksProps<T extends string> {
  readonly items: readonly TabLinkItem<T>[];
  /**
   * Открытая вкладка. У заготовки раздела её нет: подсветить она может только
   * не ту.
   */
  readonly active?: T | undefined;
  /** Имя ленты для озвучки: «Стопки заказов», «Разделы склада». */
  readonly label: string;
  readonly appearance?: TabAppearance | undefined;
  /** Заготовка раздела: данных ещё нет, и лента об этом сообщает. */
  readonly busy?: boolean | undefined;
  /**
   * Лента едет вбок вместо переноса — до 900px, где перенос и случается.
   *
   * 🔴 Умолчание — перенос, и менять его стоит только с доводом. У склада
   * довод есть (issue #609): три подписи вида («Остатки по зонам», «Журнал
   * движений», «Зоны хранения») на 320 не встают в строку, а перенос давал
   * вертикальный список из трёх ссылок — он читается как случайные ссылки, а
   * не как переключатель вида. Открытая вкладка у склада первая или вторая из
   * трёх, поэтому за край она не уезжает и подвозить её к глазам не нужно —
   * а без этого прокрутка у ленты-ссылок и не годится (ADR-266).
   */
  readonly scroll?: boolean | undefined;
  readonly className?: string | undefined;
}

/**
 * Лента вкладок, за каждой из которых стоит свой запрос к базе (issue #584).
 *
 * 🔴 Обычные ссылки, а не кнопки: остатки, журнал движений и зоны — три разные
 * выборки, и делать их обязан сервер. Вкладка живёт в адресе, а не в состоянии
 * компонента: «Отказы за прошлый месяц» — ссылка, которую кладут в закладки и
 * присылают коллеге (ADR-255). Своего JS у переключателя нет вовсе — историю и
 * переход делает браузер, поэтому «назад» возвращает на предыдущую вкладку, а
 * не выбрасывает из раздела (issue #339, #342, #587).
 *
 * 🔴 Компонент серверный, и это не случайность. Подписи и адреса приходят
 * готовым списком, а не функциями: функция не переживает границу
 * сервер→клиент, и рядом с `'use client'` этот же код падал с «Functions
 * cannot be passed directly to Client Components».
 *
 * 🔴 По умолчанию лента переносится на вторую строку, а не прокручивается
 * вбок. Прокрутка увела бы последнюю вкладку за правый край, и открытая
 * оказалась бы невидимой: подвезти её к глазам без клиентского JS нечем, а
 * платить бюджетом панели за позицию прокрутки списка нечем тем более
 * (ADR-266). Где открытая вкладка заведомо не уезжает, прокрутку включает
 * `scroll`. Лента с панелями (`TabPanels`) клиентская и едет вбок всегда —
 * там подвезти открытую вкладку по силам.
 */
export function TabLinks<T extends string>({
  items,
  active,
  label,
  appearance = 'underline',
  busy,
  scroll,
  className,
}: TabLinksProps<T>) {
  /* Пустой набор не рисует ничего: линия ленты во всю ширину раздела без
     единой вкладки читается как оборванная вёрстка, а не как «вкладок нет». */
  if (items.length === 0) return null;

  return (
    <nav
      className={[stripClassName(appearance, scroll === true), className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-busy={busy}
    >
      <div className={rowClassName(appearance)}>
        {items.map((item) => {
          const current = item.key === active;
          const classes = tabClassName(appearance, current);

          if (item.href === undefined) {
            return (
              <span className={classes} key={item.key} aria-disabled="true">
                <TabLabel item={item} />
              </span>
            );
          }

          return (
            <Link
              className={classes}
              key={item.key}
              href={item.href}
              /* Прокрутка не сбрасывается наверх: вкладки сравнивают, стоя в
                 середине списка, и прыжок к шапке на каждом переключении
                 теряет место (ADR-258, issue #342). */
              scroll={false}
              aria-current={current ? 'page' : undefined}
            >
              <TabLabel item={item} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
