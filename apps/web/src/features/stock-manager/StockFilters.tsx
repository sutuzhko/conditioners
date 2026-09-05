import Link from 'next/link';

import { Badge, Button, Icon, Input } from '@/shared/ui';

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
 * Фильтр остатков: поиск, группа и вид списка.
 *
 * 🔴 Всё живёт в адресе, а не в состоянии компонента: иначе «Дальше» уводит
 * на вторую страницу нефильтрованного справочника и владелец теряет запрос
 * ровно там, где он был нужен. Отфильтрованные остатки — ссылка, её можно
 * сохранить и прислать себе.
 *
 * Отсюда серверный компонент без единой строки своего JS: группы — обычные
 * ссылки, поиск — обычная форма `GET`, которую браузер отправляет сам, а
 * раскрытие пилюли — `details`, то есть работа браузера (тот же приём, что у
 * фильтра нарядов: две ленты в соседних разделах обязаны работать одинаково).
 *
 * 🔴 Группы и вид списка ушли под пилюлю на всех ширинах (issue #609, макет
 * 1440: «Группа ⌄»). Развёрнутыми они занимали на 320 две трети первого
 * экрана — до первой позиции было 1341px, четверть документа, — и владелец
 * назвал раздел на телефоне нечитаемым. Ширина тут ни при чём: ряд из десяти
 * чипов не нужен и на 1440, когда из него выбирают один раз в день.
 */
export function StockFilters({ filters, groups, total, lowCount }: StockFiltersProps) {
  /* Умолчания в адрес не уезжают: `?low=0` ничего не выбирает. */
  const carried = stockQuery({
    group: filters.group,
    low: filters.low,
    archived: filters.archived,
    size: filters.size,
  });

  const plain = !filters.low && !filters.archived;

  /* Сколько условий отбора стоит на списке. Поиск сюда не входит: он виден
     полем рядом, и считать его вторым разом значит объяснять дважды. */
  const applied = (filters.group === '' ? 0 : 1) + (plain ? 0 : 1);

  return (
    <div className={styles.bar}>
      <div className={styles.pills}>
        {/* 🔴 Раскрытие — `details`, а не кнопка с состоянием: пилюля
            раскрывается и с клавиатуры, и без JS, и объявляется читалкой как
            раскрывающийся список. Лист ложится поверх содержимого, а не
            раздвигает ряд: иначе таблица уезжала бы вниз при каждом открытии. */}
        <details className={styles.filter}>
          <summary className={styles.pill}>
            {texts.filterPill}
            {applied === 0 ? null : (
              /* Число на экране, словами — для озвучки: «2» без пояснения
                 читалка объявляет как «Фильтр 2», и это не значит ничего. */
              <Badge size="sm" variant="accent">
                <span aria-hidden="true">{applied}</span>
                <span className="srOnly">{texts.filterApplied(applied)}</span>
              </Badge>
            )}

            {/* 🔴 Крестик виден только на телефоне, где лист раскрывается во
                весь экран и пилюля становится его шапкой: закрывать оттуда
                нечем — сама пилюля уезжает под лист. На широком экране лист
                висит поповером под пилюлей, и крестик там лишний. */}
            <Icon className={styles.close} name="close" size={18} />
          </summary>

          <div className={styles.sheet}>
            {/* Три взаимоисключающих вида списка, а не два переключателя: архив
                показывается вместо обычных позиций, а не вместе с ними. */}
            <nav className={styles.group} aria-label={texts.lowLabel}>
              <span className={styles.groupTitle}>{texts.lowLabel}</span>

              <Link
                className={itemClass(plain)}
                href={stockHref({ ...filters, low: false, archived: false })}
                aria-current={plain ? 'page' : undefined}
              >
                {texts.lowAll}
              </Link>
              <Link
                className={itemClass(filters.low)}
                href={stockHref({ ...filters, low: true, archived: false })}
                aria-current={filters.low ? 'page' : undefined}
              >
                {texts.lowOnly}
              </Link>
              <Link
                className={itemClass(filters.archived)}
                href={stockHref({ ...filters, low: false, archived: true })}
                aria-current={filters.archived ? 'page' : undefined}
              >
                {texts.archivedOnly}
              </Link>
            </nav>

            <nav className={styles.group} aria-label={texts.groupLabel}>
              <span className={styles.groupTitle}>{texts.groupLabel}</span>

              <Link
                className={itemClass(filters.group === '')}
                href={stockHref({ ...filters, group: '' })}
                aria-current={filters.group === '' ? 'page' : undefined}
              >
                {texts.groupAll}
              </Link>

              {groups.map((group) => (
                <Link
                  className={itemClass(group === filters.group)}
                  key={group}
                  href={stockHref({ ...filters, group })}
                  aria-current={group === filters.group ? 'page' : undefined}
                >
                  {group}
                </Link>
              ))}
            </nav>

            {/* 🔴 Поиск живёт в том же листе, что группы и вид списка
                (issue #609). «Фильтр» — это всё, чем сужают список, и держать
                половину под пилюлей, а половину рядом значит объяснять одно и
                то же дважды. На телефоне ищут реже, чем смотрят «чего не
                хватает», а поле с кнопкой стоили пятидесяти пикселей до
                первой позиции.

                `role="search"` — ориентир для скринридера: без него поиск в
                панели неотличим от любой другой формы на странице. */}
            <form className={styles.form} action={STOCK_PATH} method="get" role="search">
              {Object.entries(carried).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} readOnly />
              ))}

              <Input
                label={texts.searchLabel}
                placeholder={texts.searchPlaceholder}
                name="q"
                type="search"
                defaultValue={filters.query}
                autoComplete="off"
                wrapperClassName={styles.field}
              />

              <Button type="submit" size="sm">
                {texts.search}
              </Button>
            </form>
          </div>
        </details>
      </div>

      {/* 🔴 Ниже 600px счётчики отсюда уходят: те же два числа уже стоят
          подстрокой под заголовком раздела. Четыре формулировки одного факта
          подряд — «всего 15», «Всего позиций: 15», «ниже порога 2», «Ниже
          порога заказа: 2 позиции» — владелец читает как четыре разных
          сообщения и ищет между ними разницу, которой нет. Сброс отбора
          остаётся: он не число, а действие. */}
      <p className={styles.total}>
        <span className={styles.counter}>
          {filters.query === '' ? texts.totalCount(total) : texts.found(total)}
        </span>
        {lowCount === undefined ? null : (
          <span
            className={[styles.counter, lowCount > 0 ? styles.lowCount : null]
              .filter(Boolean)
              .join(' ')}
          >
            {texts.lowCount(lowCount)}
          </span>
        )}
        {stockFiltersApplied(filters) ? (
          <Link className={styles.reset} href={stockHref({})}>
            {texts.searchReset}
          </Link>
        ) : null}
      </p>
    </div>
  );
}

/** Пункт листа: выбранный помечен и краской, и `aria-current`. */
function itemClass(active: boolean): string {
  return [styles.item, active ? styles.active : null].filter(Boolean).join(' ');
}
