import Link from 'next/link';

import { Pager } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import {
  STOCK_PAGE_SIZES,
  STOCK_PATH,
  stockQuery,
  type StockFilterState,
  type StockOverview,
} from './model';
import styles from './StockPager.module.css';

export interface StockPagerProps {
  readonly overview: StockOverview;
  /** Действующий фильтр: он переезжает на соседние страницы и на другой шаг. */
  readonly filters: StockFilterState;
}

/**
 * Подвал таблицы остатков: счёт слева, номера страниц по центру, «Строк на
 * странице» справа (issue #608, макет `Stock.body.html`).
 *
 * 🔴 Число строк перестало быть константой репозитория. Пагинатор, не
 * показанный на пятнадцати позициях, — не баг: баг был в том, что двадцать
 * зашиты в код и владелец не мог их изменить.
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
export function StockPager({ overview, filters }: StockPagerProps) {
  /* Выбор шага не имеет смысла, пока и самая мелкая ступень не делит список:
     ряд ссылок, каждая из которых показывает то же самое, только сбивает. */
  const smallest = STOCK_PAGE_SIZES[0];
  const sizeShown = overview.itemsTotal > smallest;

  if (overview.pages <= 1 && !sizeShown) return null;

  return (
    <div className={styles.pager}>
      <span className={styles.count}>{texts.shown(overview.items.length, overview.total)}</span>

      {/* 🔴 Обёртка нужна ради телефона: ниже 600px разбивка уходит на свою
          строку, а счёт и ступени остаются на первой. Сам кит про подвал
          склада не знает и класса не принимает, поэтому строку ему задаёт
          обёртка; выше 600px она `display: contents` и геометрию подвала не
          меняет вовсе. */}
      {overview.pages > 1 ? (
        <div className={styles.nav}>
          <Pager
            page={overview.page}
            pages={overview.pages}
            basePath={STOCK_PATH}
            query={stockQuery(filters)}
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

          {STOCK_PAGE_SIZES.map((size) =>
            size === filters.size ? (
              /* Текущий шаг — не ссылка: переход на самого себя ничего не
                 делает, а озвучка объявила бы его обычной целью. */
              <span className={styles.sizeOn} key={size} aria-current="true">
                {size}
              </span>
            ) : (
              <Link
                className={styles.sizeItem}
                key={size}
                href={{ pathname: STOCK_PATH, query: stockQuery({ ...filters, size }) }}
                aria-label={texts.perPageSet(size)}
              >
                <span aria-hidden="true">{size}</span>
              </Link>
            ),
          )}
        </span>
      ) : null}
    </div>
  );
}
