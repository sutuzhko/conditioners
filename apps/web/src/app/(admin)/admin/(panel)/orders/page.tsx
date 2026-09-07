import type { Metadata } from 'next';
import Link from 'next/link';

import { cache } from 'react';

import {
  DEFAULT_ORDER_FILTERS,
  ORDERS_PATH,
  OrderFilters,
  OrderInstallerAgenda,
  OrderList,
  agendaWindow,
  installerWhenFromParam,
  isOrderPeriod,
  orderColumnsFromParam,
  orderManagerContent as texts,
  orderPageSizeFromParam,
  orderSortFromParam,
  orderTabFromParam,
  orderTabItems,
  pageNumber,
  type OrderFilterState,
} from '@/features/order-manager';
import { requirePage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { agenda, counts, historyTotals, list, type Viewer } from '@/server/repo/orders';
import { Skeleton, TabLinks, buttonClassName } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { OrdersAgendaSkeleton, OrdersSkeleton } from './OrdersSkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Наряды.
 *
 * 🔴 Раздел открыт обеим ролям, но экранов у него два, а не один урезанный
 * (issue #633). Владельцу — список со стопками, фильтрами и разбивкой:
 * «что где висит». Монтажнику — наряд дня, сгруппированный по времени:
 * «куда я еду дальше». Здесь `requirePage`, а не `requireOwnerPage` — у
 * монтажника это рабочий экран.
 *
 * 🔴 Данные сужает репозиторий, а не разметка: и `agenda`, и `list` получают
 * смотрящего и ставят фильтр по исполнителю в сам запрос (ADR-114).
 *
 * Стопка, период, монтажник, сортировка, состав колонок, число строк и
 * страница живут в адресе: «Отказы за прошлый месяц» — ссылка, которую
 * сохраняют в закладки. Окно наряда дня — там же, параметром `when`.
 *
 * 🔴 Заготовки раздела живут внутри страницы, а не в `loading.tsx` (issue
 * #651). Заготовка на границе раздела уходила в ответ первой и уносила с
 * собой код 200: чужой наряд отвечал монтажнику «не найдено» телом при
 * статусе 200 — и сквозной сценарий доступа вынужден был это признать. Здесь
 * до первого байта доходит только разбор адреса.
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
    /** Окно наряда дня монтажника: сегодня, завтра, неделя (issue #633). */
    when?: string;
  }>;
}) {
  const session = await requirePage();

  const params = await searchParams;
  const viewer = { role: session.role, userId: session.userId };

  /* 🔴 Монтажнику — свой экран, а не таблица владельца в карточках (issue
     #633). Ветка стоит до чтения списка: у наряда дня свой запрос, своё окно
     и свой порядок — по времени, а не по состоянию, — и общий `list` со
     стопками, фильтрами и разбивкой ему не нужен вовсе. */
  if (session.role !== 'owner') {
    const when = installerWhenFromParam(params.when);

    return (
      <div className={styles.page}>
        <DataBlock
          skeleton={<OrdersAgendaSkeleton />}
          title={texts.loadFailed}
          note={blockErrorNote(ORDERS_PATH)}
        >
          <InstallerAgendaBlock viewer={viewer} when={when} />
        </DataBlock>
      </div>
    );
  }

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link
            className={buttonClassName({ size: 'sm' })}
            href={{ pathname: '/admin/orders/new' }}
          >
            {texts.add}
          </Link>
        </div>

        {/* 🔴 Строка счёта вместо прозы (issue #593, макет «Заказы»): три числа
            отвечают на три вопроса, которые владелец задаёт разделу первым.
            Проза объясняла, что такое наряд, — а это он знает и без нас.

            Свой кусок потока: строка стоит над стопками, и ждать ради неё
            таблицу значит держать пустым весь экран. */}
        <DataBlock
          surface="bare"
          skeleton={<Skeleton variant="text" width="28ch" />}
          title={texts.loadFailed}
          note={blockErrorNote(ORDERS_PATH)}
        >
          <OrdersCount viewer={viewer} />
        </DataBlock>
      </header>

      <DataBlock
        skeleton={<OrdersSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(ORDERS_PATH)}
      >
        <OrdersBlock filters={filters} page={pageNumber(params.page)} viewer={viewer} />
      </DataBlock>
    </div>
  );
}

/**
 * Стопки раздела — один поход в базу на все куски потока.
 *
 * 🔴 `cache` React держит результат в пределах одного запроса: строка счёта в
 * шапке и лента стопок над таблицей считают одно и то же, и второй проход по
 * нарядам не только ничего бы не ускорил, но и мог бы разойтись с первым.
 */
const stacksOfOrders = cache(counts);

/** Наряд дня монтажника: свой запрос, своё окно и свой порядок — по времени. */
async function InstallerAgendaBlock({
  viewer,
  when,
}: {
  readonly viewer: Viewer;
  readonly when: ReturnType<typeof installerWhenFromParam>;
}) {
  const orders = await agenda(viewer, agendaWindow(when));

  return <OrderInstallerAgenda orders={orders} when={when} />;
}

/** Строка счёта раздела — свой кусок потока: она стоит над стопками. */
async function OrdersCount({ viewer }: { readonly viewer: Viewer }) {
  const stacks = await stacksOfOrders(viewer);

  return (
    <p className={styles.lead}>
      {[
        texts.countAll(stacks.all),
        texts.countActive(stacks.active),
        texts.countOverdue(stacks.overdue),
      ].join(' · ')}
    </p>
  );
}

/**
 * Стопки, фильтры и таблица нарядов — то, что приезжает отдельным куском
 * потока.
 *
 * Фрагмент, а не обёртка: блоки страницы стоят колонкой с общим зазором, и
 * лишний `<div>` сдвинул бы таблицу относительно того, что показала заготовка.
 */
async function OrdersBlock({
  filters,
  page,
  viewer,
}: {
  readonly filters: OrderFilterState;
  readonly page: number;
  readonly viewer: Viewer;
}) {
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
        page,
        installerId: filters.installer,
        sort: filters.sort,
        size: filters.size,
      },
      viewer,
    ),
    stacksOfOrders(viewer),
    listInstallers(true),
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
    filters.tab === 'history'
      ? await historyTotals({ period: filters.period, installerId: filters.installer }, viewer)
      : undefined;

  return (
    <>
      {/* Стопки — над рядом фильтров, как в макете: сначала выбирают, что за
          список смотрят, и только потом сужают его условиями. */}
      <TabLinks
        items={orderTabItems(filters, {
          active: stacks.active,
          new: stacks.new,
          all: stacks.all,
        })}
        active={filters.tab}
        label={texts.tabsLabel}
      />

      <OrderFilters filters={filters} installers={crew} total={found.total} />

      <OrderList page={found} filters={filters} installers={crew} totals={totals} />
    </>
  );
}
