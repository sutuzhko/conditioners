import Link from 'next/link';

import { STOCK_ITEM_NEW_PATH, stockManagerContent as texts } from '@/features/stock-manager';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Шапка раздела. Вынесена в компонент, потому что её же — слово в слово —
 * рисует заготовка `loading.tsx`: заготовка обязана держать ту же высоту, что
 * готовая страница, а повторённая руками разметка расходится с оригиналом на
 * первой правке (ADR-239).
 */
export function StockHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headline}>
        <h1 className={styles.title}>{texts.title}</h1>

        <div className={styles.actions}>
          <Link
            className={buttonClassName({ size: 'sm' })}
            href={{ pathname: STOCK_ITEM_NEW_PATH }}
          >
            {texts.itemAddOpen}
          </Link>
        </div>
      </div>

      <p className={styles.lead}>{texts.lead}</p>
    </header>
  );
}
