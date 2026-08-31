import { ButtonLink, Card, EmptyState, Pager } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

import { OrderCardView } from './OrderCardView';
import { orderManagerContent as texts } from './content';
import {
  ORDERS_PATH,
  filtersApplied,
  ordersQuery,
  type OrderFilterState,
  type OrderPage,
} from './model';
import styles from './OrderList.module.css';

export interface OrderListProps {
  readonly page: OrderPage;
  /** Действующий фильтр: пустой список тогда объясняется иначе. */
  readonly filters?: Partial<OrderFilterState> | undefined;
  /** Экран монтажника: у пустоты там другая причина и другой совет. */
  readonly forInstaller?: boolean | undefined;
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
 * Список нарядов со страницами.
 *
 * Серверный компонент целиком: карточки только показывают данные, а переход
 * между страницами и выбор стопки — это адрес, а не состояние. Панель не
 * платит за список ни байтом JS.
 */
export function OrderList({ page, filters = {}, forInstaller = false }: OrderListProps) {
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
      {page.items.map((order) => (
        <OrderCardView key={order.id} order={order} />
      ))}

      <Pager
        page={page.page}
        pages={page.pages}
        basePath={ORDERS_PATH}
        query={ordersQuery(filters)}
      />
    </div>
  );
}
