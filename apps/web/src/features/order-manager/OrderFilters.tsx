import Link from 'next/link';

import { Badge, Input } from '@/shared/ui';

import { columnLocked, columnsOf, columnShown, type OrderColumn } from './columns';
import { ORDER_PERIOD_TITLE, orderManagerContent as texts } from './content';
import {
  DEFAULT_ORDER_FILTERS,
  NO_INSTALLER,
  ORDERS_PATH,
  ORDER_PERIODS,
  ORDER_SORTS,
  installerName,
  ordersHref,
  ordersQuery,
  type OrderFilterState,
  type OrderInstallerRef,
  type OrderSort,
} from './model';
import styles from './OrderFilters.module.css';

export interface OrderFiltersProps {
  /** Всё состояние списка разом: пилюли строят ссылки, меняя по одному полю. */
  readonly filters: OrderFilterState;
  /** Кого можно выбрать в фильтре по монтажнику. Пусто — пилюли выбора нет. */
  readonly installers?: readonly OrderInstallerRef[] | undefined;
  readonly total: number;
}

/** Подпись колонки для пилюли «Колонки». Одна на весь раздел. */
const COLUMN_TITLE: Readonly<Record<OrderColumn, string>> = {
  number: texts.colNumber,
  type: texts.colType,
  client: texts.colWork,
  source: texts.colSource,
  created: texts.colCreated,
  installer: texts.colInstaller,
  when: texts.colWhen,
  closed: texts.colClosed,
  declined: texts.colDeclined,
  reason: texts.colReason,
  status: texts.colStatus,
  sum: texts.colSum,
};

/**
 * Ряд над таблицей: пилюли «Фильтр · Сортировка · Колонки», снятые условия
 * плашками, поиск справа (issue #345, #594, макет «Заказы»).
 *
 * 🔴 Всё живёт в адресе, а не в состоянии компонента: «Отказы за прошлый
 * месяц, отсортированные по сумме» — это ссылка, которую можно сохранить в
 * закладки и прислать себе.
 *
 * Отсюда и серверный компонент без единой строки своего JS: период, монтажник,
 * сортировка и колонки — обычные ссылки, поиск — обычная форма `GET`, а
 * раскрытие пилюли — `details`, то есть работа браузера. Роутер и состояние
 * дали бы ровно тот же адрес, но ценой килобайтов в бюджете панели и
 * неработающего фильтра там, где JS не выполнился.
 *
 * 🔴 Применённые условия остаются видимыми плашками и снимаются по одному:
 * иначе непонятно, почему нарядов шесть вместо двадцати четырёх, — а это
 * первый вопрос владельца к списку, в котором чего-то не хватает. Сортировка
 * и состав колонок плашками не становятся: они список не укорачивают, и
 * крестик у них означал бы, что наряды спрятаны из-за них.
 */
export function OrderFilters({ filters, installers = [], total }: OrderFiltersProps) {
  const { tab, period, query, installer, sort, columns } = filters;

  const chosen = installers.find((person) => person.id === installer) ?? null;

  /* Условия, отличающиеся от умолчания. Стопка сюда не входит: она стоит
     вкладкой над таблицей и снимается переходом на «Все». */
  const applied = [
    ...(period === DEFAULT_ORDER_FILTERS.period
      ? []
      : [
          {
            key: 'period',
            title: ORDER_PERIOD_TITLE[period],
            href: ordersHref({ ...filters, period: DEFAULT_ORDER_FILTERS.period }),
          },
        ]),
    ...(installer === ''
      ? []
      : [
          {
            key: 'installer',
            title:
              installer === NO_INSTALLER
                ? texts.installerNoneFilter
                : chosen === null
                  ? texts.installerLabel
                  : installerName(chosen),
            href: ordersHref({ ...filters, installer: '' }),
          },
        ]),
    ...(query === ''
      ? []
      : [
          {
            key: 'query',
            title: texts.queryChip(query),
            href: ordersHref({ ...filters, query: '' }),
          },
        ]),
  ];

  /* Умолчания не уезжают в скрытые поля: иначе поиск возвращал бы
     `?tab=active&period=all` — параметры, которые ничего не выбирают. */
  const carried = ordersQuery({ ...filters, query: '' });

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
            <nav className={styles.group} aria-label={texts.periodLabel}>
              <span className={styles.groupTitle}>{texts.periodLabel}</span>
              {ORDER_PERIODS.map((item) => (
                <Link
                  className={itemClass(item === period)}
                  key={item}
                  href={ordersHref({ ...filters, period: item })}
                  aria-current={item === period ? 'page' : undefined}
                >
                  {ORDER_PERIOD_TITLE[item]}
                </Link>
              ))}
            </nav>

            {/* Монтажник — второе условие, которым владелец сужает список: «что
                сегодня у Петра» спрашивают чаще, чем что-либо ещё. «Не
                назначен» стоит первым: это вопрос, на который отвечают до
                конца дня, а не когда-нибудь (макет «Заказы»). */}
            {installers.length === 0 ? null : (
              <nav className={styles.group} aria-label={texts.installerLabel}>
                <span className={styles.groupTitle}>{texts.installerLabel}</span>

                <Link
                  className={itemClass(installer === '')}
                  href={ordersHref({ ...filters, installer: '' })}
                  aria-current={installer === '' ? 'page' : undefined}
                >
                  {texts.installerAny}
                </Link>

                <Link
                  className={itemClass(installer === NO_INSTALLER)}
                  href={ordersHref({ ...filters, installer: NO_INSTALLER })}
                  aria-current={installer === NO_INSTALLER ? 'page' : undefined}
                >
                  {texts.installerNoneFilter}
                </Link>

                {installers.map((person) => (
                  <Link
                    className={itemClass(installer === person.id)}
                    key={person.id}
                    href={ordersHref({ ...filters, installer: person.id })}
                    aria-current={installer === person.id ? 'page' : undefined}
                  >
                    {installerName(person)}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </details>

        <details className={styles.filter}>
          <summary className={styles.pill}>{texts.sortPill}</summary>

          <div className={styles.sheet}>
            <nav className={styles.group} aria-label={texts.sortLabel}>
              {ORDER_SORTS.map((item: OrderSort) => (
                <Link
                  className={itemClass(item === sort)}
                  key={item}
                  href={ordersHref({ ...filters, sort: item })}
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
            Состояние живёт в адресе — владелец, собравший себе список без
            сумм, может его сохранить. */}
        <details className={styles.filter}>
          <summary className={styles.pill}>{texts.columnsPill}</summary>

          <div className={styles.sheet}>
            <nav className={styles.group} aria-label={texts.columnsLabel}>
              {columnsOf(tab)
                .filter((column) => !columnLocked(column))
                .map((column) => {
                  const shown = columnShown(tab, columns, column);
                  const next = shown
                    ? columns.filter((item) => item !== column)
                    : [...columns, column];

                  return (
                    <Link
                      className={itemClass(shown)}
                      key={column}
                      href={ordersHref({ ...filters, columns: next })}
                      aria-label={
                        shown
                          ? texts.columnHide(COLUMN_TITLE[column])
                          : texts.columnShow(COLUMN_TITLE[column])
                      }
                    >
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
            <span className="srOnly">{texts.filterDrop(condition.title)}</span>
          </Link>
        ))}
      </div>

      {/* `role="search"` — ориентир для скринридера: без него поиск в панели
          неотличим от любой другой формы на странице.

          🔴 Кнопки «Найти» рядом с полем нет (макет «Заказы»): поле поиска
          отправляется Enter'ом, как любая форма из одного поля, а кнопка
          занимала бы место рядом с тремя пилюлями и ряд переносился бы на
          вторую строку уже на 1200. Отправку с клавиатуры даёт `type="search"`
          внутри `form` — ни строчки JS для этого не нужно. */}
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
      </form>

      {/* «Найдено» говорится только про поиск: вкладка и период список не
          ищут, а выбирают, и «найдено 3» под стопкой отказов читалось бы как
          результат запроса, которого не было. */}
      <p className={styles.total}>{query === '' ? texts.totalCount(total) : texts.found(total)}</p>
    </div>
  );
}

/** Пункт раскрытого списка: выбранный отмечен, остальные — обычные ссылки. */
function itemClass(active: boolean): string {
  return [styles.item, active ? styles.active : null].filter(Boolean).join(' ');
}
