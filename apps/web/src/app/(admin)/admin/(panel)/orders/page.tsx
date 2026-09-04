import type { Metadata } from 'next';
import Link from 'next/link';

import {
  DEFAULT_ORDER_FILTERS,
  OrderFilters,
  OrderList,
  OrderTabs,
  isOrderPeriod,
  orderManagerContent as texts,
  orderTabFromParam,
  pageNumber,
} from '@/features/order-manager';
import { requirePage } from '@/server/guards';
import { list } from '@/server/repo/orders';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Наряды.
 *
 * 🔴 Раздел открыт обеим ролям, и разграничение делает не эта страница, а
 * репозиторий: `list` получает смотрящего и сужает выборку до назначенных
 * ему нарядов (ADR-114). Здесь `requirePage`, а не `requireOwnerPage` —
 * у монтажника это рабочий экран.
 *
 * Стопка, период, поиск и страница живут в адресе: «Отказы за прошлый
 * месяц» — ссылка, которую сохраняют в закладки.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; q?: string; page?: string }>;
}) {
  const session = await requirePage();

  const { tab, period, q, page } = await searchParams;

  /* Вкладка разбирается здесь, до чтения данных: страница уходит в базу за той
     стопкой, что стоит в адресе, и приходит уже открытой на ней (issue #340).
     Мусор в параметре открывает первую вкладку, а не роняет раздел. */
  const selectedTab = orderTabFromParam(tab);
  const selectedPeriod =
    period !== undefined && isOrderPeriod(period) ? period : DEFAULT_ORDER_FILTERS.period;
  const query = q?.trim() ?? '';

  const found = await list(
    { query, tab: selectedTab, period: selectedPeriod, page: pageNumber(page) },
    { role: session.role, userId: session.userId },
  );

  const owner = session.role === 'owner';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{owner ? texts.title : texts.installerTitle}</h1>

          {/* Завести наряд может только владелец: у монтажника это список
              его выездов, а не инструмент планирования. */}
          {owner ? (
            <Link
              className={buttonClassName({ size: 'sm' })}
              href={{ pathname: '/admin/orders/new' }}
            >
              {texts.add}
            </Link>
          ) : null}
        </div>

        <p className={styles.lead}>{owner ? texts.lead : texts.installerLead}</p>
      </header>

      {/* Стопки — над рядом фильтров, как в макете: сначала выбирают, что за
          список смотрят, и только потом сужают его условиями. */}
      <OrderTabs tab={selectedTab} period={selectedPeriod} query={query} />

      <OrderFilters tab={selectedTab} period={selectedPeriod} query={query} total={found.total} />

      <OrderList
        page={found}
        filters={{ tab: selectedTab, period: selectedPeriod, query }}
        forInstaller={!owner}
      />
    </div>
  );
}
