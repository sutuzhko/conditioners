import Link from 'next/link';

import { Button, Card, Input } from '@/shared/ui';

import { ORDER_PERIOD_TITLE, ORDER_TAB_TITLE, orderManagerContent as texts } from './content';
import {
  ORDERS_PATH,
  ORDER_PERIODS,
  ORDER_TABS,
  filtersApplied,
  ordersHref,
  ordersQuery,
  type OrderPeriod,
  type OrderTab,
} from './model';
import styles from './OrderFilters.module.css';

export interface OrderFiltersProps {
  /** Выбранная стопка. Без параметра в адресе — «Активные». */
  readonly tab: OrderTab;
  readonly period: OrderPeriod;
  /** Запрос, с которым страница отрисована: поле открывается заполненным. */
  readonly query: string;
  readonly total: number;
}

/**
 * Фильтр списка нарядов: стопка, период и поиск.
 *
 * 🔴 Всё живёт в адресе, а не в состоянии компонента: «Отказы за прошлый
 * месяц» — это ссылка, которую можно сохранить в закладки и прислать себе.
 *
 * Отсюда и серверный компонент без единой строки своего JS: стопки с периодом —
 * обычные ссылки, а поиск — обычная форма `GET`, которую браузер отправляет
 * сам. Роутер дал бы ровно тот же адрес, но ценой килобайтов в бюджете панели
 * и неработающего фильтра там, где JS не выполнился.
 */
export function OrderFilters({ tab, period, query, total }: OrderFiltersProps) {
  const hrefFor = (next: { tab?: OrderTab; period?: OrderPeriod }) =>
    ordersHref({ tab, period, query, ...next });

  /* Умолчания не уезжают в скрытые поля: иначе поиск возвращал бы
     `?tab=active&period=all` — параметры, которые ничего не выбирают. */
  const carried = ordersQuery({ tab, period });

  return (
    <Card as="section" className={styles.card}>
      <nav className={styles.row} aria-label={texts.tabsLabel}>
        {ORDER_TABS.map((item) => (
          <Link
            className={[styles.chip, item === tab ? styles.active : null].filter(Boolean).join(' ')}
            key={item}
            href={hrefFor({ tab: item })}
            /* 🔴 Прокрутка не сбрасывается наверх: стопки сравнивают, стоя в
               середине списка, и прыжок к шапке на каждом переключении теряет
               место (issue #342). */
            scroll={false}
            aria-current={item === tab ? 'page' : undefined}
          >
            {ORDER_TAB_TITLE[item]}
          </Link>
        ))}
      </nav>

      <nav className={styles.row} aria-label={texts.periodLabel}>
        {ORDER_PERIODS.map((item) => (
          <Link
            className={[styles.chip, styles.quiet, item === period ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            key={item}
            href={hrefFor({ period: item })}
            aria-current={item === period ? 'page' : undefined}
          >
            {ORDER_PERIOD_TITLE[item]}
          </Link>
        ))}
      </nav>

      {/* `role="search"` — ориентир для скринридера: без него поиск в панели
          неотличим от любой другой формы на странице. */}
      <form className={styles.form} action={ORDERS_PATH} method="get" role="search">
        {Object.entries(carried).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} readOnly />
        ))}

        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <div className={styles.actions}>
          <Button type="submit" size="sm">
            {texts.search}
          </Button>

          {filtersApplied({ tab, period, query }) ? (
            <Link className={styles.reset} href={ordersHref({})}>
              {texts.searchReset}
            </Link>
          ) : null}
        </div>
      </form>

      <p className={styles.total}>{query === '' ? texts.totalCount(total) : texts.found(total)}</p>
    </Card>
  );
}
