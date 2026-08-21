import type { Metadata } from 'next';
import Link from 'next/link';

import { listAll } from '@/server/repo/products';
import { AdminCatalogList, adminCatalogContent as texts } from '@/widgets/admin-catalog';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/** Каталог: список моделей и вход в правку каждой. */
export default async function AdminCatalogPage() {
  const products = await listAll();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
        </div>

        <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: '/admin/catalog/new' }}>
          {texts.add}
        </Link>
      </header>

      <AdminCatalogList products={products} />
    </div>
  );
}
