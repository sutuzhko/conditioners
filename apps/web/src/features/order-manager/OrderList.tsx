import { ButtonLink, Card, EmptyState, Pager } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import {
  ORDERS_PATH,
  filtersApplied,
  ordersQuery,
  type OrderFilterState,
  type OrderPage,
} from './model';
import { OrderTable } from './OrderTable';
import styles from './OrderList.module.css';

export interface OrderListProps {
  readonly page: OrderPage;
  /** Действующий фильтр: пустой список тогда объясняется иначе. */
  readonly filters?: Partial<OrderFilterState> | undefined;
  /** Экран монтажника: у пустоты там другая причина, а суммы у него нет. */
  readonly forInstaller?: boolean | undefined;
  /** Момент отсчёта просрочки — прокидывается в таблицу ради снимков и тестов. */
  readonly now?: string | undefined;
}

/** Пустой список: почему пусто и что с этим делать — три разных ответа. */
function emptyText(
  filtered: boolean,
  forInstaller: boolean,
): {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
} {
  if (filtered) return { icon: 'search', title: texts.emptyFound, text: texts.emptyFoundText };
  if (forInstaller)
    return { icon: 'orders', title: texts.emptyInstaller, text: texts.emptyInstallerText };
  return { icon: 'orders', title: texts.emptyTitle, text: texts.emptyText };
}

/**
 * Список нарядов со страницами (issue #345).
 *
 * Серверный компонент целиком: таблица только показывает данные, а переход
 * между страницами и выбор стопки — это адрес, а не состояние. Панель не
 * платит за список ни байтом JS.
 */
export function OrderList({ page, filters = {}, forInstaller = false, now }: OrderListProps) {
  if (page.items.length === 0) {
    /* 🔴 «Нарядов нет» и «по фильтру не нашлось» — разные новости. Первое
       говорит завести наряд, второе — сменить вкладку или период. */
    const empty = emptyText(filtersApplied(filters), forInstaller);

    return (
      <Card as="section">
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          action={
            filtersApplied(filters) ? (
              <ButtonLink href="/admin/orders" size="sm" variant="bordered">
                {texts.emptyFoundAction}
              </ButtonLink>
            ) : undefined
          }
        >
          {empty.text}
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className={styles.list}>
      {/* Карточка не обрезает содержимое: обрезка предка отменяет прокрутку
          таблицы вбок вместе с её затуханием (комментарий в Table.tsx). */}
      <Card as="section" padding="none">
        <OrderTable items={page.items} forInstaller={forInstaller} now={now} />
      </Card>

      <Pager
        page={page.page}
        pages={page.pages}
        basePath={ORDERS_PATH}
        query={ordersQuery(filters)}
      />
    </div>
  );
}
