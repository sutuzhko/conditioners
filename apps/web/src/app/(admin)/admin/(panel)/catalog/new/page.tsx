import type { Metadata } from 'next';
import Link from 'next/link';

import { productFormContent as texts } from '@/features/product-form';

import { ProductEditor } from '../ProductEditor';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.createTitle };

/** Новая модель каталога. */
export default function AdminNewProductPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/catalog' }}>
            ← Каталог
          </Link>
          <h1 className={styles.title}>{texts.createTitle}</h1>
        </div>
      </header>

      <ProductEditor />
    </div>
  );
}
