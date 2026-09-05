import Link from 'next/link';

import { orderManagerContent as texts } from './content';
import {
  ORDERS_PATH,
  ORDER_PAGE_SIZES,
  ordersQuery,
  type OrderFilterState,
  type OrderPage,
} from './model';
import styles from './OrderPager.module.css';

export interface OrderPagerProps {
  readonly page: OrderPage;
  readonly filters: OrderFilterState;
}

/**
 * Сколько номеров страниц показывать подряд.
 *
 * Пять — окно, в котором текущая страница стоит посередине и видны обе
 * соседние пары. Больше номеров не помогает: по девятой странице списка
 * никто не целится, туда добираются поиском.
 */
const WINDOW = 5;

/** Номера страниц вокруг текущей — окно, прижатое к краям списка. */
function pageWindow(page: number, pages: number): readonly number[] {
  const from = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), pages - WINDOW + 1));
  const to = Math.min(pages, from + WINDOW - 1);

  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/**
 * Подвал таблицы нарядов: счёт слева, номера страниц по центру, «Строк на
 * странице» справа (issue #595, макет «Заказы»).
 *
 * 🔴 Свой компонент, а не `shared/ui/Pager`: у кита разбивка — отдельный ряд
 * из трёх пилюль по центру, сознательно без полосы номеров (см. `Pager.tsx`).
 * Здесь макет требует другого: подвал внутри карточки таблицы, три зоны, шаг
 * листания страницами и переключатель числа строк. Это другой компонент, а не
 * настройка того же, и сводить их к одному значило бы дать китовому все
 * пропсы разом ради одного раздела.
 *
 * 🔴 Ссылками, а не состоянием: страница и число строк остаются в адресе,
 * ссылку можно прислать, а список рисует сервер.
 */
export function OrderPager({ page, filters }: OrderPagerProps) {
  const href = (
    target: number,
    size = filters.size,
  ): { pathname: string; query: Record<string, string> } => ({
    pathname: ORDERS_PATH,
    /* Первая страница живёт по чистому адресу: `?page=1` в ссылке, которую
       владелец кому-то пришлёт, — лишний параметр без смысла. */
    query: {
      ...ordersQuery({ ...filters, size }),
      ...(target > 1 ? { page: String(target) } : {}),
    },
  });

  const numbers = pageWindow(page.page, page.pages);

  return (
    <div className={styles.pager}>
      <span className={styles.count}>{texts.rangeOf(page.items.length, page.total)}</span>

      {page.pages <= 1 ? null : (
        <nav className={styles.pages} aria-label={texts.pagesLabel}>
          {page.page > 1 ? (
            <Link
              className={styles.step}
              href={href(page.page - 1)}
              rel="prev"
              aria-label={texts.pagePrev}
            >
              <span aria-hidden="true">‹</span>
            </Link>
          ) : (
            <span className={styles.stepOff} aria-hidden="true">
              ‹
            </span>
          )}

          {numbers.map((number) =>
            number === page.page ? (
              /* Текущая страница — не ссылка: переход на самого себя ничего не
                 делает, а читалка объявила бы его как обычную цель. */
              <span className={styles.current} key={number} aria-current="page">
                <span aria-hidden="true">{number}</span>
                <span className="srOnly">{texts.pageCurrent(number)}</span>
              </span>
            ) : (
              <Link
                className={styles.number}
                key={number}
                href={href(number)}
                aria-label={texts.pageGo(number)}
              >
                <span aria-hidden="true">{number}</span>
              </Link>
            ),
          )}

          {page.page < page.pages ? (
            <Link
              className={styles.step}
              href={href(page.page + 1)}
              rel="next"
              aria-label={texts.pageNext}
            >
              <span aria-hidden="true">›</span>
            </Link>
          ) : (
            <span className={styles.stepOff} aria-hidden="true">
              ›
            </span>
          )}
        </nav>
      )}

      {/* Число строк — три ступени ссылками: выбор из трёх значений не стоит
          ни выпадающего списка, ни его клиентского кода. Смена шага
          возвращает на первую страницу: седьмая страница по восемь строк и
          седьмая по тридцать две — разные места списка. */}
      <span className={styles.size}>
        <span className={styles.sizeTitle}>{texts.perPage}</span>

        {ORDER_PAGE_SIZES.map((size) =>
          size === filters.size ? (
            <span className={styles.sizeOn} key={size} aria-current="true">
              {size}
            </span>
          ) : (
            <Link
              className={styles.sizeItem}
              key={size}
              href={href(1, size)}
              aria-label={texts.perPageSet(size)}
            >
              <span aria-hidden="true">{size}</span>
            </Link>
          ),
        )}
      </span>
    </div>
  );
}
