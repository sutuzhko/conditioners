import type { Metadata } from 'next';
import Link from 'next/link';

import {
  DEFAULT_ORDER_FILTERS,
  OrderFilters,
  OrderList,
  OrderTabs,
  isOrderPeriod,
  orderColumnsFromParam,
  orderManagerContent as texts,
  orderPageSizeFromParam,
  orderSortFromParam,
  orderTabFromParam,
  pageNumber,
  type OrderFilterState,
} from '@/features/order-manager';
import { requirePage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { counts, historyTotals, list } from '@/server/repo/orders';
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
 * Стопка, период, монтажник, сортировка, состав колонок, число строк и
 * страница живут в адресе: «Отказы за прошлый месяц» — ссылка, которую
 * сохраняют в закладки.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    period?: string;
    q?: string;
    page?: string;
    installer?: string;
    sort?: string;
    size?: string;
    cols?: string;
  }>;
}) {
  const session = await requirePage();

  const params = await searchParams;

  /* Вкладка разбирается здесь, до чтения данных: страница уходит в базу за той
     стопкой, что стоит в адресе, и приходит уже открытой на ней (issue #340).
     Мусор в параметре открывает первую вкладку, а не роняет раздел. */
  const filters: OrderFilterState = {
    tab: orderTabFromParam(params.tab),
    period:
      params.period !== undefined && isOrderPeriod(params.period)
        ? params.period
        : DEFAULT_ORDER_FILTERS.period,
    query: params.q?.trim() ?? '',
    installer: params.installer?.trim() ?? '',
    sort: orderSortFromParam(params.sort),
    size: orderPageSizeFromParam(params.size),
    columns: orderColumnsFromParam(params.cols),
  };

  const owner = session.role === 'owner';
  const viewer = { role: session.role, userId: session.userId };

  /* 🔴 Монтажники нужны владельцу и только ему: они наполняют фильтр по
     исполнителю и групповое назначение — оба решения владельца (CRM.md §6).
     Уволенных в списке нет: назначать наряд человеку, у которого закрыт
     доступ, значит отправить работу в пустоту. */
  const [found, stacks, installers] = await Promise.all([
    list(
      {
        query: filters.query,
        tab: filters.tab,
        period: filters.period,
        page: pageNumber(params.page),
        installerId: filters.installer,
        sort: filters.sort,
        size: filters.size,
      },
      viewer,
    ),
    counts(viewer),
    owner ? listInstallers(true) : Promise.resolve([]),
  ]);

  /* Форма исполнителя для панели: репозиторий отдаёт учётную запись целиком,
     а разделу нужны только имя, логин и оформление. */
  const crew = installers.map((staff) => ({
    id: staff.id,
    name: staff.name,
    login: staff.login,
    employment: staff.employment,
  }));

  /* Итог периода нужен только «Истории»: на остальных стопках он отвечал бы
     на вопрос, которого к ним не задают. */
  const totals =
    owner && filters.tab === 'history'
      ? await historyTotals({ period: filters.period, installerId: filters.installer }, viewer)
      : undefined;

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

        {/* 🔴 Строка счёта вместо прозы (issue #593, макет «Заказы»): три числа
            отвечают на три вопроса, которые владелец задаёт разделу первым.
            Проза объясняла, что такое наряд, — а это он знает и без нас. */}
        <p className={styles.lead}>
          {owner
            ? [
                texts.countAll(stacks.all),
                texts.countActive(stacks.active),
                texts.countOverdue(stacks.overdue),
              ].join(' · ')
            : texts.installerLead}
        </p>
      </header>

      {/* Стопки — над рядом фильтров, как в макете: сначала выбирают, что за
          список смотрят, и только потом сужают его условиями. */}
      <OrderTabs
        tab={filters.tab}
        period={filters.period}
        query={filters.query}
        counts={{ active: stacks.active, new: stacks.new, all: stacks.all }}
      />

      <OrderFilters filters={filters} installers={crew} total={found.total} />

      <OrderList
        page={found}
        filters={filters}
        installers={crew}
        totals={totals}
        forInstaller={!owner}
      />
    </div>
  );
}
