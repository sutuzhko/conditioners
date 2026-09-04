import type { Metadata } from 'next';
import Link from 'next/link';

import {
  StockZoneForm,
  STOCK_ZONES_PATH,
  stockManagerContent as texts,
} from '@/features/stock-manager';
import { Card } from '@/shared/ui';

import { zoneFormData } from '../../data';
import styles from '../../page.module.css';

export const metadata: Metadata = { title: texts.zoneAddTitle };

export const dynamic = 'force-dynamic';

/**
 * Новая зона страницей — то же, что рисует окно на переходе из списка зон.
 *
 * 🔴 Ни одного названия зоны страница не предлагает: свой гараж владелец
 * называет сам (инвариант 8).
 */
export default async function AdminStockZoneNewPage() {
  const { people } = await zoneFormData();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={STOCK_ZONES_PATH}>
        {texts.zonesBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.zoneAddTitle}</h1>
        <p className={styles.lead}>{texts.zoneAddHint}</p>
      </header>

      <Card>
        <StockZoneForm people={people} surface="bare" />
      </Card>
    </div>
  );
}
