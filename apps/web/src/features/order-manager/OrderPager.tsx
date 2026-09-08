import { PageSize, Pager } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import {
  ORDERS_PATH,
  ORDER_PAGE_SIZES,
  ordersQuery,
  type OrderFilterState,
  type OrderPage,
  type OrderPageSize,
} from './model';
import styles from './OrderPager.module.css';

export interface OrderPagerProps {
  readonly page: OrderPage;
  readonly filters: OrderFilterState;
}

/**
 * Адрес списка с заданным шагом. Номера страницы в нём нет: шаг сбрасывает её.
 *
 * 🔴 Только запрос, без пути — так же, как в подвале склада: шаг листания
 * меняет запрос текущей страницы, а не уводит с неё, и относительный адрес
 * этим и является. При `typedRoutes` он к тому же единственный, который
 * система типов принимает без оглядки на конкретный маршрут.
 */
function sizeHref(filters: OrderFilterState, size: OrderPageSize): `?${string}` {
  return `?${new URLSearchParams(ordersQuery({ ...filters, size })).toString()}`;
}

/**
 * Подвал таблицы нарядов: счёт слева, номера страниц по центру, «Строк на
 * странице» справа (issue #595, макет «Заказы»).
 *
 * 🔴 Своей разбивки здесь больше нет (issue #748). До этой правки компонент
 * рисовал собственные номера, собственные шаги и собственные ступени шага — с
 * третьим в панели радиусом (`--r-sm` против `--r-pill` у кита и 8px в
 * макете) и своим окном из пяти номеров подряд без многоточий. Владелец
 * посмотрел на сводку и сказал: «почини всю пагинацию, чтобы была просто
 * одинаковой, а не на каждой странице своя». Разбивка и ступень шага
 * приходят из кита; здесь остаётся то, что принадлежит разделу, — счёт
 * показанного, правила адреса и раскладка подвала.
 *
 * 🔴 Ссылками, а не состоянием: страница и число строк остаются в адресе,
 * ссылку можно прислать, а список рисует сервер. Смена шага возвращает на
 * первую страницу: седьмая страница по восемь строк и седьмая по тридцать
 * две — разные места списка.
 */
export function OrderPager({ page, filters }: OrderPagerProps) {
  return (
    <div className={styles.pager}>
      <span className={styles.count}>{texts.rangeOf(page.items.length, page.total)}</span>

      {/* 🔴 Подписей разбивки раздел не задаёт: все четыре, что он держал у
          себя, дословно совпадали с умолчаниями кита (issue #748). Копия,
          совпадающая сегодня, — это расхождение, отложенное до первой правки
          кита, и ровно от таких копий эта задача и избавляется.

          🔴 Обёртка нужна ради телефона: ниже 600px разбивка уходит на свою
          строку, а счёт и ступень остаются на своих. Выше 600px она
          `display: contents` и геометрию подвала не меняет вовсе. */}
      <div className={styles.nav}>
        <Pager
          page={page.page}
          pages={page.pages}
          basePath={ORDERS_PATH}
          query={ordersQuery(filters)}
          numbers
        />
      </div>

      <PageSize
        className={styles.size}
        title={texts.perPage}
        value={sizeHref(filters, filters.size)}
        options={ORDER_PAGE_SIZES.map((size) => ({
          label: String(size),
          href: sizeHref(filters, size),
        }))}
      />
    </div>
  );
}
