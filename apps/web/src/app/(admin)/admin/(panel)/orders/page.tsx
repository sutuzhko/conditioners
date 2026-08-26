import type { Metadata } from 'next';
import Link from 'next/link';

import {
  DEFAULT_ORDER_FILTERS,
  OrderFilters,
  OrderList,
  isOrderPeriod,
  isOrderTab,
  orderManagerContent as texts,
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
  const selectedTab = tab !== undefined && isOrderTab(tab) ? tab : DEFAULT_ORDER_FILTERS.tab;
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

      <OrderFilters tab={selectedTab} period={selectedPeriod} query={query} total={found.total} />

      <OrderList
        page={found}
        filters={{ tab: selectedTab, period: selectedPeriod, query }}
        forInstaller={!owner}
      />
    </div>
  );
}
