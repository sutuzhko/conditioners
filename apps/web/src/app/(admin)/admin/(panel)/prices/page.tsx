import type { Metadata } from 'next';

import { pricesFormContent as texts } from '@/features/prices-form';
import { getPrices } from '@/server/repo/prices';

import { PricesEditor } from './PricesEditor';
import styles from '../leads/page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Прайс монтажа и ставки допработ.
 *
 * 🔴 Ставки могут быть не заполнены: репозиторий возвращает `null`, а не
 * нули, — подставить свою цифру вместо незаданной ставки значило бы выдумать
 * цену (инвариант 8). В форме такое поле открывается пустым.
 */
export default async function AdminPricesPage() {
  const { prices, extras } = await getPrices();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <PricesEditor
        values={{
          prices: prices.map((row) => ({
            cls: row.cls,
            power: row.power,
            area: row.area,
            price: String(row.price),
            term: row.term,
          })),
          extras: {
            trassaPerM: extras === null ? '' : String(extras.trassaPerM),
            shtrobPerM: extras === null ? '' : String(extras.shtrobPerM),
            heightWorks: extras === null ? '' : String(extras.heightWorks),
            trassaIncludedM: extras === null ? '' : String(extras.trassaIncludedM),
            heightFloorFrom: extras === null ? '' : String(extras.heightFloorFrom),
          },
        }}
      />
    </div>
  );
}
