import { Alert, ButtonLink, Card, EmptyState } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

import { rowActionOf, selectableTab, visibleColumns } from './columns';
import { orderManagerContent as texts } from './content';
import {
  filtersApplied,
  type OrderFilterState,
  type OrderInstallerRef,
  type OrderPage,
} from './model';
import { OrderBulk } from './OrderBulk';
import { OrderPager } from './OrderPager';
import { OrderTable } from './OrderTable';
import styles from './OrderList.module.css';

/** Итог закрытых работ за период — шапка вкладки «История» (issue #597). */
export type OrderHistoryTotals = {
  readonly closed: number;
  readonly revenue: number;
};

export interface OrderListProps {
  readonly page: OrderPage;
  /** Полное состояние списка: из него берутся и колонки, и ссылки разбивки. */
  readonly filters: OrderFilterState;
  /** Кому можно назначить наряд. Пусто — группового действия нет. */
  readonly installers?: readonly OrderInstallerRef[] | undefined;
  /** Итог периода на вкладке «История». Монтажнику не приходит (ADR-092). */
  readonly totals?: OrderHistoryTotals | undefined;
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
 * Список нарядов со страницами (issue #345, #596, #597).
 *
 * 🔴 Серверный компонент почти целиком: таблица только показывает данные, а
 * переход между страницами и выбор стопки — это адрес, а не состояние.
 * Клиентского кода здесь ровно два места, и оба про необратимое: выбор строк с
 * групповым назначением и подтверждения в строке.
 */
export function OrderList({
  page,
  filters,
  installers = [],
  totals,
  forInstaller = false,
  now,
}: OrderListProps) {
  const { tab } = filters;

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

  const columns = visibleColumns(tab, filters.columns);
  const rowAction = forInstaller ? null : rowActionOf(tab);

  /* Выбор строк включается только там, где групповому действию есть что
     делать: назначать исполнителя выполненной работе или отказу нечего. */
  const selectable = !forInstaller && selectableTab(tab) && installers.length > 0;

  /* Карточка не обрезает содержимое: обрезка предка отменяет прокрутку
     таблицы вбок вместе с её затуханием (комментарий в Table.tsx). */
  const table = (
    <Card as="section" padding="none">
      <OrderTable
        items={page.items}
        columns={columns}
        rowAction={rowAction}
        selectable={selectable}
        forInstaller={forInstaller}
        now={now}
      />

      {/* Подвал — часть карточки таблицы, как в макете: счёт, номера страниц
          и число строк принадлежат списку, а не странице вокруг него. */}
      <OrderPager page={page} filters={filters} />
    </Card>
  );

  return (
    <div className={styles.list}>
      {/* Плашка вкладки «Новые»: пока не назначен монтажник, наряд не попадает
          ни в календарь, ни к исполнителю, — и это единственное, что с этой
          стопкой нужно сделать (макет `OrdersTabs`). */}
      {tab === 'new' && !forInstaller ? (
        <Alert tone="warning" title={texts.newsAlert(page.total)}>
          {texts.newsAlertText}
        </Alert>
      ) : null}

      {/* Итог периода над историей. Маржи в нём нет: без закупочной цены
          позиции склада её нечем считать (ADR-310, issue #628), а разность
          «сумма минус выплата» маржой не является. */}
      {totals === undefined ? null : (
        <p className={styles.totals}>
          <span className={styles.total}>
            {texts.historyClosed} <b className={styles.totalValue}>{totals.closed}</b>
          </span>
          <span className={styles.total}>
            {texts.historyRevenue}{' '}
            <b className={styles.totalValue}>{texts.money(totals.revenue)}</b>
          </span>
        </p>
      )}

      {selectable ? (
        <OrderBulk total={page.total} pageCount={page.items.length} installers={installers}>
          {table}
        </OrderBulk>
      ) : (
        table
      )}
    </div>
  );
}
