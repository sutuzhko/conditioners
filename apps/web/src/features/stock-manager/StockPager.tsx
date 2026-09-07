import { PageSize, Pager } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import { STOCK_PAGE_SIZES, pageSizeQuery, type StockPageSize } from './model';
import styles from './StockPager.module.css';

export interface StockPagerProps {
  readonly page: number;
  readonly pages: number;
  /** Строка счёта: «Показано 20 из 137 движений». Считает вызывающий: у остатков это позиции, у журнала — движения. */
  readonly count: string;
  /**
   * Сколько записей в списке всего. По нему решается, есть ли смысл в выборе
   * шага: пока список не длиннее самой мелкой ступени, любая из них показывает
   * одно и то же.
   */
  readonly scope: number;
  /** Действующий шаг листания: выбор владельца живёт в адресе (issue #608). */
  readonly size: StockPageSize;
  /** Адрес списка: он же у соседних страниц и у другого шага. */
  readonly basePath: string;
  /**
   * Что переезжает в адрес вместе со страницей и шагом — отбор и вкладка
   * раздела. Ключ `size` отсюда снимается: шаг ставит сам пагинатор.
   */
  readonly query: Readonly<Record<string, string>>;
}

/** Адрес списка с заданным шагом. Страница снимается: шаг меняет её смысл. */
function sizeHref(
  basePath: string,
  query: Readonly<Record<string, string>>,
  step: StockPageSize,
): string {
  const params = new URLSearchParams(pageSizeQuery(query, step)).toString();
  return params === '' ? basePath : `${basePath}?${params}`;
}

/**
 * Подвал списка склада: счёт слева, номера страниц по центру, «Строк на
 * странице» справа (issue #608, макет `Stock.body.html`).
 *
 * 🔴 Число строк перестало быть константой репозитория. Пагинатор, не
 * показанный на пятнадцати позициях, — не баг: баг был в том, что двадцать
 * зашиты в код и владелец не мог их изменить.
 *
 * 🔴 Один подвал на оба списка раздела — остатки и журнал движений (issue
 * #725). Журнал стоял на обычном `Pager` и на зашитых двадцати строках, и
 * вторая разбивка в том же разделе с другим набором возможностей читается как
 * сбой. Поэтому пагинатор принимает числа, а не выборку: `StockOverview` в
 * пропах означал бы, что журналу его надо подделать.
 *
 * 🔴 Ни номеров, ни ступеней шага здесь своих нет: и то и другое рисует кит
 * (`shared/ui/Pager`, `shared/ui/PageSize`). Разбивка в панели одна на все
 * списки — вторая её редакция расходится с первой на первой же правке
 * геометрии, и владелец увидел это на сводке: «на каждой странице своя»
 * (issue #748). Здесь остаётся только то, чего у кита нет и быть не может, —
 * счёт показанного и правила адреса раздела.
 *
 * 🔴 Смена шага возвращает на первую страницу: седьмая страница по восемь
 * строк и седьмая по пятьдесят — разные места справочника. Поэтому в адресе
 * ступени номера страницы нет вовсе.
 */
export function StockPager({ page, pages, count, scope, size, basePath, query }: StockPagerProps) {
  /* Выбор шага не имеет смысла, пока и самая мелкая ступень не делит список:
     ряд ссылок, каждая из которых показывает то же самое, только сбивает. */
  const smallest = STOCK_PAGE_SIZES[0];
  const sizeShown = scope > smallest;

  if (pages <= 1 && !sizeShown) return null;

  return (
    <div className={styles.pager}>
      <span className={styles.count}>{count}</span>

      {/* 🔴 Обёртка нужна ради телефона: ниже 600px разбивка уходит на свою
          строку, а счёт и ступени остаются на первой. Сам кит про подвал
          склада не знает и класса не принимает, поэтому строку ему задаёт
          обёртка; выше 600px она `display: contents` и геометрию подвала не
          меняет вовсе. */}
      {pages > 1 ? (
        <div className={styles.nav}>
          <Pager
            page={page}
            pages={pages}
            basePath={basePath}
            query={pageSizeQuery(query, size)}
            numbers
          />
        </div>
      ) : null}

      {sizeShown ? (
        <PageSize
          className={styles.size}
          title={texts.perPage}
          value={sizeHref(basePath, query, size)}
          options={STOCK_PAGE_SIZES.map((step) => ({
            label: String(step),
            href: sizeHref(basePath, query, step),
          }))}
        />
      ) : null}
    </div>
  );
}
