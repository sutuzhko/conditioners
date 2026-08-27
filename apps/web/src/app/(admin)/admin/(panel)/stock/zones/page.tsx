import type { Metadata } from 'next';
import Link from 'next/link';

import {
  StockZones,
  STOCK_PATH,
  stockManagerContent as texts,
  type StockZonePerson,
} from '@/features/stock-manager';
import { staffTitle } from '@/entities/staff/model';
import { requireOwnerPage } from '@/server/guards';
import { list as listStaff } from '@/server/repo/admin-users';
import { zones as listZones } from '@/server/repo/stock';

import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.zonesTitle };

export const dynamic = 'force-dynamic';

/**
 * Зоны хранения: гараж и машины монтажников.
 *
 * 🔴 Раздел владельца: зоны заводит он, монтажник видит только свою машину
 * (ADR-134). Проверка стоит до чтения данных (ADR-095).
 *
 * 🔴 Ни одного названия зоны страница не предлагает: свой гараж владелец
 * называет сам (инвариант 8).
 */
export default async function AdminStockZonesPage() {
  const session = await requireOwnerPage();

  const [zones, staff] = await Promise.all([
    /* Вместе с архивными: страница зон — единственное место, откуда зону
       возвращают из архива, и не показать её здесь значит потерять насовсем. */
    listZones({ role: session.role, userId: session.userId }, { archived: true }),
    listStaff(),
  ]);

  /* Машину закрепляют за человеком, а не за должностью: список — все, кто
     заходит в панель, включая самого владельца, если ездит он. */
  const people: readonly StockZonePerson[] = staff
    .filter((person) => person.active)
    .map((person) => ({ id: person.id, name: staffTitle(person) }));

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.zonesBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.zonesTitle}</h1>
        <p className={styles.lead}>{texts.zonesLead}</p>
      </header>

      <StockZones zones={zones} people={people} />
    </div>
  );
}
