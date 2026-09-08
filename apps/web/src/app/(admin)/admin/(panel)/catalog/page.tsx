import type { Metadata } from 'next';
import Link from 'next/link';

import { CATALOG_NEW_PATH, CATALOG_SPECS_PATH } from '@/features/product-form';
import { requireOwnerPage } from '@/server/guards';
import { adminCounts, listAdmin } from '@/server/repo/products';
import { mediaExists } from '@/server/uploads/store';
import { pageNumber } from '@/shared/lib/paging';
import { Pager, buttonClassName } from '@/shared/ui';
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

import { CatalogSummarySkeleton, CatalogTableSkeleton } from './CatalogSkeleton';
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
 *
 * 🔴 Заготовки раздела живут внутри страницы, а не в `loading.tsx` (issue
 * #651). Заготовка на границе раздела уходила в ответ первой и уносила с
 * собой код 200: страница ещё только шла в базу, а статус был отправлен, и
 * `notFound()` соседней карточки менял потом лишь тело. Здесь до первого
 * байта ответа доходит только разбор адреса, а место данных держит `Suspense`
 * каждого блока.
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          {/* 🔴 Счётчики считаются по всему каталогу, а не по показанной
              странице: подпись «8 моделей» над списком из восьми при сорока в
              базе — это не округление, а ложь.

              Свой кусок потока, а не общий со списком: строка стоит над
              отбором, и ждать ради неё таблицу значит держать пустым весь
              экран. Заготовка занимает ту же строку — отбор под ней не
              двигается (ADR-239). */}
          <DataBlock
            surface="line"
            skeleton={<CatalogSummarySkeleton />}
            title={texts.loadFailed}
            note={blockErrorNote(CATALOG_PATH)}
          >
            <CatalogSummary />
          </DataBlock>
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
        skeleton={<CatalogTableSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(CATALOG_PATH)}
      >
        <CatalogBlock filter={filter} page={pageNumber(params.page)} />
      </DataBlock>
    </div>
  );
}

/**
 * Строка счётчиков раздела — свой кусок потока (issue #651).
 *
 * Отказ базы гасится внутри: ошибка раздела одна, и она принадлежит списку —
 * там есть и объяснение, и повтор. Строка без чисел при этом сохраняет
 * высоту, и раскладка не прыгает.
 */
async function CatalogSummary() {
  const counts = await countsOrNull();

  return (
    <p className={styles.summary}>
      {counts === null
        ? texts.summaryUnknown
        : texts.summary(counts.total, counts.visible, counts.onSale)}
    </p>
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
  const rows: readonly CatalogRow[] = await Promise.all(
    found.items.map(async (product) => {
      /* 🔴 Ссылка без файла — это «снимка нет», а не битая картинка (issue
         #662). Файл на томе и запись в базе живут порознь: том переехал,
         каталог не примонтирован, база наполнена в другом окружении. У списка
         уже есть честная заглушка для модели без фотографии — она и верна,
         второго вида пустоты здесь не нужно. */
      const photo = product.photos[0]?.url ?? null;

      return {
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
        photo: (await mediaExists(photo)) ? photo : null,
      } satisfies CatalogRow;
    }),
  );

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

/** Счётчики раздела или `null`, если база не ответила. */
async function countsOrNull(): Promise<Awaited<ReturnType<typeof adminCounts>> | null> {
  try {
    return await adminCounts();
  } catch {
    return null;
  }
}
