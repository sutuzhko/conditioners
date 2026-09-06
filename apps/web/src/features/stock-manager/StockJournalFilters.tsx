import Link from 'next/link';

import { Button, Input } from '@/shared/ui';

import { STOCK_MOVE_TITLES, STOCK_PERIOD_TITLES, stockManagerContent as texts } from './content';
import {
  DEFAULT_STOCK_JOURNAL_FILTERS,
  STOCK_MOVE_KINDS,
  STOCK_PERIODS,
  stockJournalApplied,
  stockJournalQuery,
  type StockJournalFilterState,
} from './model';
import styles from './StockJournalFilters.module.css';

export interface StockJournalFiltersProps {
  readonly filters: StockJournalFilterState;
  /** Адрес журнала и параметры, без которых он не открывается: вкладка раздела. */
  readonly basePath: string;
  readonly baseQuery?: Record<string, string> | undefined;
}

/**
 * Отбор в журнале движений: вид, период, поиск (issue #610, макет
 * `StockTabs.body.html`).
 *
 * 🔴 Всё живёт в адресе, а не в состоянии компонента: отфильтрованный журнал —
 * ссылка, которую можно сохранить и прислать себе, а «Дальше» не сбрасывает
 * отбор. Отсюда серверный компонент без единой строки своего JS: виды и
 * периоды — обычные ссылки, поиск — обычная форма `GET`.
 *
 * 🔴 Период ссылками, а не полем даты. Журнал спрашивают «что было в этом
 * месяце» и «что было в прошлом» — два вопроса, на которые три ссылки
 * отвечают целиком; произвольный интервал потребовал бы двух полей даты,
 * клиентского состояния и проверки «начало позже конца» ради вопроса,
 * которого владелец складу не задаёт.
 */
export function StockJournalFilters({
  filters,
  basePath,
  baseQuery = {},
}: StockJournalFiltersProps) {
  const href = (
    next: Partial<StockJournalFilterState>,
  ): { pathname: string; query: Record<string, string> } => ({
    pathname: basePath,
    query: { ...baseQuery, ...stockJournalQuery({ ...filters, ...next }) },
  });

  /* Умолчания в адрес не уезжают, но всё, что выбрано, обязано переехать в
     форму поиска: `GET` заменяет строку запроса целиком, и без скрытых полей
     «Найти» роняет и вид, и период, и саму вкладку раздела. */
  const carried = { ...baseQuery, ...stockJournalQuery({ ...filters, query: '' }) };

  return (
    <div className={styles.filters}>
      <nav className={styles.row} aria-label={texts.journalFilter}>
        <Link
          className={[styles.chip, filters.kind === undefined ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={href({ kind: undefined })}
          aria-current={filters.kind === undefined ? 'page' : undefined}
        >
          {texts.journalAllKinds}
        </Link>
        {STOCK_MOVE_KINDS.map((option) => (
          <Link
            key={option}
            className={[styles.chip, filters.kind === option ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            href={href({ kind: option })}
            aria-current={filters.kind === option ? 'page' : undefined}
          >
            {STOCK_MOVE_TITLES[option]}
          </Link>
        ))}
      </nav>

      <nav className={styles.row} aria-label={texts.journalPeriod}>
        {STOCK_PERIODS.map((option) => (
          <Link
            key={option}
            className={[styles.chip, styles.quiet, filters.period === option ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            href={href({ period: option })}
            aria-current={filters.period === option ? 'page' : undefined}
          >
            {STOCK_PERIOD_TITLES[option]}
          </Link>
        ))}
      </nav>

      {/* `role="search"` — ориентир для скринридера: без него поиск в панели
          неотличим от любой другой формы на странице. */}
      <form className={styles.form} action={basePath} method="get" role="search">
        {Object.entries(carried).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} readOnly />
        ))}

        <Input
          label={texts.journalSearchLabel}
          hint={texts.journalSearchHint}
          placeholder={texts.journalSearchPlaceholder}
          name="q"
          type="search"
          defaultValue={filters.query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <div className={styles.actions}>
          <Button type="submit" size="sm">
            {texts.journalSearch}
          </Button>

          {stockJournalApplied(filters) ? (
            <Link
              className={styles.reset}
              href={{
                pathname: basePath,
                query: { ...baseQuery, ...stockJournalQuery(DEFAULT_STOCK_JOURNAL_FILTERS) },
              }}
            >
              {texts.journalReset}
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
