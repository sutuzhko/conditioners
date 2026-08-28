import type { Metadata } from 'next';
import Link from 'next/link';

import { productFormContent as texts } from '@/features/product-form';

import { ProductEditor } from '../ProductEditor';
import { productFormData } from '../data';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.createTitle };

export const dynamic = 'force-dynamic';

/**
 * Та же форма страницей.
 *
 * 🔴 Прямой заход по адресу окна обязан отдавать полноценную страницу: иначе
 * ссылка на форму создания ведёт в пустоту, а обновление теряет ввод
 * (ADR-117). Перехват работает только на переходе внутри раздела, и это ровно
 * то, чего от него ждут.
 */
export default async function AdminNewProductPage() {
  const { specDictionary } = await productFormData();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link className={styles.back} href={{ pathname: '/admin/catalog' }}>
            {texts.back}
          </Link>
          <h1 className={styles.title}>{texts.createTitle}</h1>
        </div>
      </header>

      <ProductEditor specDictionary={specDictionary} />
    </div>
  );
}
