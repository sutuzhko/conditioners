import Link from 'next/link';

import { Badge, Input } from '@/shared/ui';

import { adminSummaryContent as texts } from './summary-content';
import {
  DEFAULT_UPCOMING_FILTERS,
  SUMMARY_PATH,
  UPCOMING_COLUMNS,
  UPCOMING_PARAMS,
  UPCOMING_SHOWS,
  UPCOMING_SORTS,
  toggledColumns,
  upcomingQuery,
  upcomingReset,
  upcomingColumnLocked,
  type UpcomingColumn,
  type UpcomingFilters,
} from './summary-list';
import styles from './SummaryFilters.module.css';

export interface SummaryFiltersProps {
  /** Всё состояние списка разом: пилюли строят ссылки, меняя по одному полю. */
  readonly filters: UpcomingFilters;
  /** Сколько строк нашлось — подпись под рядом. */
  readonly total: number;
}

/** Подпись колонки в пилюле «Колонки». Одна на весь блок. */
const COLUMN_TITLE: Readonly<Record<UpcomingColumn, string>> = {
  when: texts.colWhen,
  work: texts.colWork,
  installer: texts.colInstaller,
  status: texts.colStatus,
  sum: texts.colSum,
};

/**
 * Ряд над «Ближайшими делами»: пилюли «Фильтр · Сортировка · Колонки», снятые
 * условия плашками, поиск справа (issue #591, макет «Обзор»).
 *
 * 🔴 Серверный компонент без единой строки своего JS. Отбор, порядок и состав
 * колонок — обычные ссылки, поиск — обычная форма `GET`, раскрытие пилюли —
 * `details`, то есть работа браузера. Роутер и состояние дали бы ровно тот же
 * адрес, но ценой килобайтов в бюджете первого экрана панели — а на нём и так
 * стоят два графика.
 *
 * 🔴 Применённые условия остаются видимыми плашками и снимаются по одному:
 * иначе непонятно, почему дел три вместо двадцати четырёх, — а это первый
 * вопрос владельца к списку, в котором чего-то не хватает. Сортировка и состав
 * колонок плашками не становятся: они список не укорачивают.
 */
export function SummaryFilters({ filters, total }: SummaryFiltersProps) {
  const { show, sort, query, hidden } = filters;

  const applied = [
    ...(show === DEFAULT_UPCOMING_FILTERS.show
      ? []
      : [
          {
            key: 'show',
            title: texts.showTitle[show],
            href: upcomingReset(filters, { show: DEFAULT_UPCOMING_FILTERS.show }),
          },
        ]),
    ...(query === ''
      ? []
      : [
          {
            key: 'query',
            title: texts.queryChip(query),
            href: upcomingReset(filters, { query: '' }),
          },
        ]),
  ];

  /* Умолчания не уезжают в скрытые поля: иначе поиск возвращал бы
     `?show=all&sort=time` — параметры, которые ничего не выбирают. */
  const carried = upcomingQuery({ ...filters, query: '', page: 1 });

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
              <Badge size="sm" variant="accent">
                <span aria-hidden="true">{applied.length}</span>
                <span className="srOnly">{texts.appliedCount(applied.length)}</span>
              </Badge>
            )}
          </summary>

          <div className={styles.sheet}>
            <nav className={styles.group} aria-label={texts.filterPill}>
              {UPCOMING_SHOWS.map((item) => (
                <Link
                  className={itemClass(item === show)}
                  key={item}
                  href={upcomingReset(filters, { show: item })}
                  aria-current={item === show ? 'page' : undefined}
                >
                  {texts.showTitle[item]}
                </Link>
              ))}
            </nav>
          </div>
        </details>

        <details className={styles.filter}>
          <summary className={styles.pill}>{texts.sortPill}</summary>

          <div className={styles.sheet}>
            <nav className={styles.group} aria-label={texts.sortPill}>
              {UPCOMING_SORTS.map((item) => (
                <Link
                  className={itemClass(item === sort)}
                  key={item}
                  href={upcomingReset(filters, { sort: item })}
                  aria-current={item === sort ? 'page' : undefined}
                >
                  {texts.sortTitle[item]}
                </Link>
              ))}
            </nav>
          </div>
        </details>

        {/* 🔴 Колонки переключаются ссылками, а не флажками с кнопкой
            «Применить»: у переключателя одно действие, оно и есть переход.
            «Когда» и «Работа» в список не попадают вовсе — по ним строку
            опознают, и выключить их нельзя ни пилюлей, ни адресом. */}
        <details className={styles.filter}>
          <summary className={styles.pill}>{texts.columnsPill}</summary>

          <div className={styles.sheet}>
            <nav className={styles.group} aria-label={texts.columnsPill}>
              {UPCOMING_COLUMNS.filter((column) => !upcomingColumnLocked(column)).map((column) => {
                const shown = !hidden.some((item) => item === column);

                return (
                  <Link
                    className={itemClass(shown)}
                    key={column}
                    href={upcomingReset(filters, { hidden: toggledColumns(hidden, column) })}
                    aria-label={
                      shown
                        ? texts.columnHide(COLUMN_TITLE[column])
                        : texts.columnShow(COLUMN_TITLE[column])
                    }
                  >
                    {/* Место под галочку занято всегда: иначе строки списка
                        сдвигались бы вбок при каждом переключении. */}
                    <span className={styles.mark} aria-hidden="true">
                      {shown ? '✓' : ''}
                    </span>
                    {COLUMN_TITLE[column]}
                  </Link>
                );
              })}
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
            <span className="srOnly">{texts.dropFilter(condition.title)}</span>
          </Link>
        ))}
      </div>

      {/* `role="search"` — ориентир для скринридера: без него поиск в панели
          неотличим от любой другой формы на странице. Кнопки «Найти» рядом с
          полем нет: форма из одного поля отправляется Enter'ом, и `type="search"`
          внутри `form` даёт это без единой строки JS. */}
      <form className={styles.form} action={SUMMARY_PATH} method="get" role="search">
        {Object.entries(carried).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} readOnly />
        ))}

        <Input
          label={texts.searchLabel}
          placeholder={texts.searchPlaceholder}
          name={UPCOMING_PARAMS.query}
          type="search"
          defaultValue={query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />
      </form>

      <p className={styles.total}>{texts.upcomingCountLabel(total)}</p>
    </div>
  );
}

/** Пункт раскрытого списка: выбранный отмечен, остальные — обычные ссылки. */
function itemClass(active: boolean): string {
  return [styles.item, active ? styles.active : null].filter(Boolean).join(' ');
}
