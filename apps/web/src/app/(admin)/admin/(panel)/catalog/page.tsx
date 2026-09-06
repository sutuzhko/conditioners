import type { Metadata } from 'next';
import Link from 'next/link';

import { CATALOG_NEW_PATH, CATALOG_SPECS_PATH } from '@/features/product-form';
import { requireOwnerPage } from '@/server/guards';
import { adminCounts, listAdmin } from '@/server/repo/products';
import { pageNumber } from '@/shared/lib/paging';
import { Pager, Skeleton, buttonClassName } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';
import {
  AdminCatalogList,
  CATALOG_PATH,
  CatalogSearch,
  adminCatalogContent as texts,
  catalogFilterOf,
  catalogFilterOn,
  catalogFilterQuery,
  type CatalogFilter,
  type CatalogRow,
  type CatalogSearchParams,
} from '@/widgets/admin-catalog';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Каталог: список моделей, отбор и вход в правку каждой.
 *
 * 🔴 Отбор и страница живут в адресе, а не в состоянии на клиенте (ADR-105,
 * issue #612): найденное можно оставить в закладках, а «назад» браузера
 * возвращает к прошлому списку. Разбивка — ссылками, и она не стоит панели ни
 * байта бюджета JS.
 *
 * 🔴 Список — асинхронный блок (issue #334, #336): шапка и отбор уезжают в
 * браузер сразу, таблица приезжает отдельным куском потока на место
 * заготовки, а упавший запрос показывает ошибку на её месте, оставляя
 * навигацию рабочей.
 */
export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const params = await searchParams;
  const filter = catalogFilterOf(params);

  /* 🔴 Счётчики принадлежат шапке, а не списку: приехав позже, они сдвинули бы
     таблицу вниз уже после того, как на неё посмотрели. Отказ базы гасится
     здесь — об этом скажет блок списка, у которого есть и объяснение, и
     повтор. */
  const counts = await countsOrNull();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          {/* 🔴 Счётчики считаются по всему каталогу, а не по показанной
              странице: подпись «8 моделей» над списком из восьми при сорока в
              базе — это не округление, а ложь. */}
          <p className={styles.summary}>
            {counts === null
              ? texts.summaryUnknown
              : texts.summary(counts.total, counts.visible, counts.onSale)}
          </p>
        </div>

        <div className={styles.headActions}>
          {/* Справочник открывают редко, но искать его в «Компании» никто не
              станет: он про товар и живёт рядом с каталогом (ADR-094). */}
          <Link
            className={buttonClassName({ size: 'sm', variant: 'bordered' })}
            href={{ pathname: CATALOG_SPECS_PATH }}
          >
            {texts.specsDictionary}
          </Link>
          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CATALOG_NEW_PATH }}>
            {texts.add}
          </Link>
        </div>
      </header>

      <CatalogSearch filter={filter} />

      <DataBlock
        skeleton={<Skeleton variant="block" className={styles.tableSkeleton} />}
        title={texts.loadFailed}
        note={blockErrorNote(CATALOG_PATH)}
      >
        <CatalogBlock filter={filter} page={pageNumber(params.page)} />
      </DataBlock>
    </div>
  );
}

/**
 * Таблица моделей и разбивка — то, что приезжает отдельным куском потока.
 *
 * Обёртка `data-block` — единственный узел блока, не зависящий от данных: по
 * нему сквозные сценарии находят кусок потока и меряют его положение.
 */
async function CatalogBlock({
  filter,
  page,
}: {
  readonly filter: CatalogFilter;
  readonly page: number;
}) {
  const found = await listAdmin({
    ...(filter.query === '' ? {} : { query: filter.query }),
    ...(filter.visibility === undefined ? {} : { visibility: filter.visibility }),
    page,
  });

  /* 🔴 Цены приходят посчитанными из домена (`getActivePrice`, ADR-011):
     перечёркнутой становится только та цена, по которой товар действительно
     продавался, а процент выводится из двух цен. Список их не пересчитывает. */
  const rows: readonly CatalogRow[] = found.items.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    badge: product.badge,
    areaMax: product.areaMax,
    currentPrice: product.currentPrice,
    oldPrice: product.oldPrice,
    discountPercent: product.discountPercent,
    saleTo: product.saleActive ? product.saleTo : null,
    visible: product.visible,
    featured: product.featured,
    sort: product.sort,
    photo: product.photos[0]?.url ?? null,
  }));

  return (
    <div className={styles.block} data-block="catalog">
      <AdminCatalogList products={rows} filtered={catalogFilterOn(filter)} />

      <Pager
        page={found.page}
        pages={found.pages}
        basePath={CATALOG_PATH}
        query={catalogFilterQuery(filter)}
        label={texts.pagerLabel}
        numbers
      />
    </div>
  );
}

/**
 * Счётчики раздела или `null`, если база не ответила.
 *
 * Отказ гасится здесь, а не поднимается выше: ошибка раздела одна, и она
 * принадлежит списку — там есть и объяснение, и повтор. Строка без чисел при
 * этом сохраняет высоту, и раскладка не прыгает.
 */
async function countsOrNull(): Promise<Awaited<ReturnType<typeof adminCounts>> | null> {
  try {
    return await adminCounts();
  } catch {
    return null;
  }
}
