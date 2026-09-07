import Link from 'next/link';

import { Pager } from '@/shared/ui';

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
 * 🔴 Ступени ссылками, а не выпадающим списком: выбор из трёх значений не
 * стоит ни списка, ни его клиентского кода, а страница и шаг остаются в
 * адресе — ссылку можно сохранить и прислать. Смена шага возвращает на первую
 * страницу: седьмая страница по восемь строк и седьмая по пятьдесят — разные
 * места справочника.
 *
 * 🔴 Номера страниц рисует кит (`shared/ui/Pager`), а не своя полоса: разбивка
 * в панели одна на все списки, и вторая её реализация разошлась бы с первой на
 * первой же правке геометрии. Здесь остаётся только то, чего у кита нет, —
 * счёт показанного и ступени шага.
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
        /* 🔴 Имя группы живёт в `aria-label`, а не только в видимой подписи:
           ниже 600px подпись коротка — «Строк на странице» и три ступени не
           встают в строку на 320. Озвучке объяснение нужно целиком и на
           любой ширине. */
        <span className={styles.size} role="group" aria-label={texts.perPage}>
          <span className={styles.sizeTitle} aria-hidden="true">
            {texts.perPage}
          </span>

          {STOCK_PAGE_SIZES.map((step) =>
            step === size ? (
              /* Текущий шаг — не ссылка: переход на самого себя ничего не
                 делает, а озвучка объявила бы его обычной целью. */
              <span className={styles.sizeOn} key={step} aria-current="true">
                {step}
              </span>
            ) : (
              <Link
                className={styles.sizeItem}
                key={step}
                href={{ pathname: basePath, query: pageSizeQuery(query, step) }}
                aria-label={texts.perPageSet(step)}
              >
                <span aria-hidden="true">{step}</span>
              </Link>
            ),
          )}
        </span>
      ) : null}
    </div>
  );
}
