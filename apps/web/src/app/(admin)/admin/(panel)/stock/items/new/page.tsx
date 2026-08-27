import type { Metadata } from 'next';
import Link from 'next/link';

import { StockItemForm, STOCK_PATH, stockManagerContent as texts } from '@/features/stock-manager';
import { Card } from '@/shared/ui';

import { itemFormData } from '../../data';
import styles from '../../page.module.css';

export const metadata: Metadata = { title: texts.itemAddTitle };

export const dynamic = 'force-dynamic';

/**
 * Та же форма страницей.
 *
 * 🔴 Прямой заход по адресу окна обязан отдавать полноценную страницу: иначе
 * ссылка на форму создания ведёт в пустоту, а обновление теряет ввод
 * (ADR-117). Перехват работает только на переходе внутри раздела, и это
 * ровно то, чего от него ждут.
 *
 * Заголовок и рамку даёт страница — форма приносит только поля, как и в окне.
 */
export default async function AdminStockItemNewPage() {
  const { products } = await itemFormData();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.itemAddTitle}</h1>
        <p className={styles.lead}>{texts.itemAddHint}</p>
      </header>

      <Card as="section">
        <StockItemForm products={products} surface="bare" />
      </Card>
    </div>
  );
}
