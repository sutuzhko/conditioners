import Link from 'next/link';

import { Badge, Button, Input } from '@/shared/ui';

import { ORDER_PERIOD_TITLE, orderManagerContent as texts } from './content';
import {
  DEFAULT_ORDER_FILTERS,
  ORDERS_PATH,
  ORDER_PERIODS,
  filtersApplied,
  ordersHref,
  ordersQuery,
  type OrderPeriod,
  type OrderTab,
} from './model';
import styles from './OrderFilters.module.css';

export interface OrderFiltersProps {
  /** Выбранная стопка: она переезжает вместе с периодом и поиском. */
  readonly tab: OrderTab;
  readonly period: OrderPeriod;
  /** Запрос, с которым страница отрисована: поле открывается заполненным. */
  readonly query: string;
  readonly total: number;
}

/**
 * Ряд фильтров над таблицей: пилюля «Фильтр», снятые условия плашками, поиск
 * справа (issue #345, макет «Заказы»).
 *
 * 🔴 Всё живёт в адресе, а не в состоянии компонента: «Отказы за прошлый
 * месяц» — это ссылка, которую можно сохранить в закладки и прислать себе.
 *
 * Отсюда и серверный компонент без единой строки своего JS: период — обычные
 * ссылки, поиск — обычная форма `GET`, а раскрытие пилюли — `details`, то есть
 * работа браузера. Роутер и состояние дали бы ровно тот же адрес, но ценой
 * килобайтов в бюджете панели и неработающего фильтра там, где JS не
 * выполнился.
 *
 * 🔴 Применённые условия остаются видимыми плашками и снимаются по одному:
 * иначе непонятно, почему нарядов шесть вместо двадцати четырёх, — а это
 * первый вопрос владельца к списку, в котором чего-то не хватает.
 */
export function OrderFilters({ tab, period, query, total }: OrderFiltersProps) {
  /* Условия, отличающиеся от умолчания. Стопка сюда не входит: она стоит
     вкладкой над таблицей и снимается переходом на «Все». */
  const applied = [
    ...(period === DEFAULT_ORDER_FILTERS.period
      ? []
      : [
          {
            key: 'period',
            title: ORDER_PERIOD_TITLE[period],
            href: ordersHref({ tab, query, period: DEFAULT_ORDER_FILTERS.period }),
          },
        ]),
    ...(query === ''
      ? []
      : [
          {
            key: 'query',
            title: texts.queryChip(query),
            href: ordersHref({ tab, period, query: '' }),
          },
        ]),
  ];

  /* Умолчания не уезжают в скрытые поля: иначе поиск возвращал бы
     `?tab=active&period=all` — параметры, которые ничего не выбирают. */
  const carried = ordersQuery({ tab, period });

  return (
    <div className={styles.bar}>
      <div className={styles.pills}>
        {/* 🔴 Раскрытие — `details`, а не кнопка с состоянием: пилюля
            раскрывается и с клавиатуры, и без JS, и объявляется читалкой как
            раскрывающийся список. */}
        <details className={styles.filter}>
          <summary className={styles.pill}>
            {texts.filterPill}
            {applied.length === 0 ? null : (
              /* Число на экране, словами — для озвучки: «2» без пояснения
                 читалка объявляет как «Фильтр 2», и это не значит ничего. */
              <Badge size="sm" variant="accent">
                <span aria-hidden="true">{applied.length}</span>
                <span className="srOnly">{texts.filterApplied(applied.length)}</span>
              </Badge>
            )}
          </summary>

          <div className={styles.sheet}>
            <nav className={styles.periods} aria-label={texts.periodLabel}>
              {ORDER_PERIODS.map((item) => (
                <Link
                  className={[styles.period, item === period ? styles.active : null]
                    .filter(Boolean)
                    .join(' ')}
                  key={item}
                  href={ordersHref({ tab, query, period: item })}
                  aria-current={item === period ? 'page' : undefined}
                >
                  {ORDER_PERIOD_TITLE[item]}
                </Link>
              ))}
            </nav>
          </div>
        </details>

        {applied.map((condition) => (
          <Link className={styles.chip} key={condition.key} href={condition.href}>
            <span className={styles.chipText}>{condition.title}</span>
            {/* Крестик декоративен: имя ссылки говорит, что произойдёт. */}
            <span className={styles.chipCross} aria-hidden="true">
              ×
            </span>
            <span className="srOnly">{texts.filterDrop(condition.title)}</span>
          </Link>
        ))}

        {filtersApplied({ tab, period, query }) ? (
          <Link className={styles.reset} href={ordersHref({})}>
            {texts.searchReset}
          </Link>
        ) : null}
      </div>

      {/* `role="search"` — ориентир для скринридера: без него поиск в панели
          неотличим от любой другой формы на странице. */}
      <form className={styles.form} action={ORDERS_PATH} method="get" role="search">
        {Object.entries(carried).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} readOnly />
        ))}

        <Input
          label={texts.searchLabel}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <Button type="submit" size="sm" variant="bordered">
          {texts.search}
        </Button>
      </form>

      <p className={styles.total}>{query === '' ? texts.totalCount(total) : texts.found(total)}</p>
    </div>
  );
}
