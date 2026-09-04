import type { Metadata } from 'next';
import Link from 'next/link';

import { CATALOG_NEW_PATH, CATALOG_SPECS_PATH } from '@/features/product-form';
import { requireOwnerPage } from '@/server/guards';
import { listAll } from '@/server/repo/products';
import {
  AdminCatalogList,
  adminCatalogContent as texts,
  type CatalogRow,
} from '@/widgets/admin-catalog';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/** Каталог: список моделей и вход в правку каждой. */
export default async function AdminCatalogPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const products = await listAll();

  /* 🔴 Цены приходят посчитанными из домена (`getActivePrice`, ADR-011):
     перечёркнутой становится только та цена, по которой товар действительно
     продавался, а процент выводится из двух цен. Список их не пересчитывает. */
  const rows: readonly CatalogRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
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

  const visible = rows.filter((row) => row.visible).length;
  const onSale = rows.filter((row) => row.oldPrice !== null).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          {/* Счётчики считаются из тех же строк, что показаны ниже: второй
              запрос разошёлся бы со списком на первой же правке. */}
          <p className={styles.summary}>{texts.summary(rows.length, visible, onSale)}</p>
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

      <AdminCatalogList products={rows} />
    </div>
  );
}
