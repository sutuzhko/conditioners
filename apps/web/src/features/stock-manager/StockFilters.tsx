import Link from 'next/link';

import { Button, Card, Input } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import {
  STOCK_PATH,
  stockFiltersApplied,
  stockHref,
  stockQuery,
  type StockFilterState,
} from './model';
import styles from './StockFilters.module.css';

export interface StockFiltersProps {
  readonly filters: StockFilterState;
  /** Группы справочника: список складывается из самих позиций, а не из кода. */
  readonly groups: readonly string[];
  readonly total: number;
  /** Сколько позиций ниже порога. Владельческий ключ — у монтажника его нет. */
  readonly lowCount?: number | undefined;
}

/**
 * Фильтр остатков: поиск, группа и «только к заказу».
 *
 * 🔴 Всё живёт в адресе, а не в состоянии компонента: иначе «Дальше» уводит
 * на вторую страницу нефильтрованного справочника и владелец теряет запрос
 * ровно там, где он был нужен. Отфильтрованные остатки — ссылка, её можно
 * сохранить и прислать себе.
 *
 * Отсюда серверный компонент без единой строки своего JS: группы — обычные
 * ссылки, поиск — обычная форма `GET`, которую браузер отправляет сам.
 */
export function StockFilters({ filters, groups, total, lowCount }: StockFiltersProps) {
  /* Умолчания в адрес не уезжают: `?low=0` ничего не выбирает. */
  const carried = stockQuery({
    group: filters.group,
    low: filters.low,
    archived: filters.archived,
  });

  const plain = !filters.low && !filters.archived;

  return (
    <Card as="section" className={styles.card}>
      <nav className={styles.row} aria-label={texts.groupLabel}>
        <Link
          className={[styles.chip, filters.group === '' ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={stockHref({ ...filters, group: '' })}
          aria-current={filters.group === '' ? 'page' : undefined}
        >
          {texts.groupAll}
        </Link>

        {groups.map((group) => (
          <Link
            className={[styles.chip, group === filters.group ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            key={group}
            href={stockHref({ ...filters, group })}
            aria-current={group === filters.group ? 'page' : undefined}
          >
            {group}
          </Link>
        ))}
      </nav>

      {/* Три взаимоисключающих вида списка, а не два переключателя: архив
          показывается вместо обычных позиций, а не вместе с ними. */}
      <nav className={styles.row} aria-label={texts.lowLabel}>
        <Link
          className={[styles.chip, styles.quiet, plain ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={stockHref({ ...filters, low: false, archived: false })}
          aria-current={plain ? 'page' : undefined}
        >
          {texts.lowAll}
        </Link>
        <Link
          className={[styles.chip, styles.quiet, filters.low ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={stockHref({ ...filters, low: true, archived: false })}
          aria-current={filters.low ? 'page' : undefined}
        >
          {texts.lowOnly}
        </Link>
        <Link
          className={[styles.chip, styles.quiet, filters.archived ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={stockHref({ ...filters, low: false, archived: true })}
          aria-current={filters.archived ? 'page' : undefined}
        >
          {texts.archivedOnly}
        </Link>
      </nav>

      {/* `role="search"` — ориентир для скринридера: без него поиск в панели
          неотличим от любой другой формы на странице. */}
      <form className={styles.form} action={STOCK_PATH} method="get" role="search">
        {Object.entries(carried).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} readOnly />
        ))}

        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={filters.query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <div className={styles.actions}>
          <Button type="submit" size="sm">
            {texts.search}
          </Button>

          {stockFiltersApplied(filters) ? (
            <Link className={styles.reset} href={stockHref({})}>
              {texts.searchReset}
            </Link>
          ) : null}
        </div>
      </form>

      <p className={styles.total}>
        <span>{filters.query === '' ? texts.totalCount(total) : texts.found(total)}</span>
        {lowCount === undefined ? null : (
          <span className={lowCount > 0 ? styles.lowCount : undefined}>
            {texts.lowCount(lowCount)}
          </span>
        )}
      </p>
    </Card>
  );
}
