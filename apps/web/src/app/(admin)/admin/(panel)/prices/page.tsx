import type { Metadata } from 'next';

import { pricesFormContent as texts } from '@/features/prices-form';
import { requireOwnerPage } from '@/server/guards';
import { getPrices } from '@/server/repo/prices';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { PricesEditor } from './PricesEditor';
import { PricesSkeleton } from './PricesSkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Прайс монтажа и ставки допработ.
 *
 * 🔴 Ставки могут быть не заполнены: репозиторий возвращает `null`, а не
 * нули, — подставить свою цифру вместо незаданной ставки значило бы выдумать
 * цену (инвариант 8). В форме такое поле открывается пустым.
 *
 * 🔴 Прайс — асинхронный блок (issue #334, #336): шапка уходит в браузер
 * сразу, форма приезжает отдельным куском потока на место заготовки, а упавший
 * запрос показывает ошибку на её месте, оставляя навигацию рабочей. Проверка
 * доступа идёт до первого чтения данных (ADR-095).
 */
export default async function AdminPricesPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <DataBlock
        skeleton={<PricesSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote('/admin/prices')}
        surface="bare"
      >
        <PricesBlock />
      </DataBlock>
    </div>
  );
}

/** Прайс и ставки — то, что приезжает отдельным куском потока. */
async function PricesBlock() {
  const { prices, extras } = await getPrices();

  return (
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
  );
}
