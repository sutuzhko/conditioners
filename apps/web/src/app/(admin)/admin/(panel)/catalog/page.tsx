import type { Metadata } from 'next';
import Link from 'next/link';

import { CATALOG_NEW_PATH, CATALOG_SPECS_PATH } from '@/features/product-form';
import { requireOwnerPage } from '@/server/guards';
import { listAll } from '@/server/repo/products';
import { AdminCatalogList, adminCatalogContent as texts } from '@/widgets/admin-catalog';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/** Каталог: список моделей и вход в правку каждой. */
export default async function AdminCatalogPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const products = await listAll();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
        </div>

        <div className={styles.headActions}>
          {/* Справочник открывают редко, но искать его в «Компании» никто не
              станет: он про товар и живёт рядом с каталогом (ADR-094). */}
          <Link
            className={buttonClassName({ size: 'sm', variant: 'secondary' })}
            href={{ pathname: CATALOG_SPECS_PATH }}
          >
            {texts.specsDictionary}
          </Link>
          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CATALOG_NEW_PATH }}>
            {texts.add}
          </Link>
        </div>
      </header>

      <AdminCatalogList products={products} />
    </div>
  );
}
