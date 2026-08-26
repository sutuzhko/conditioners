import type { Metadata } from 'next';
import Link from 'next/link';

import { orderManagerContent as texts } from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';

import { OrderEditor } from '../OrderEditor';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.addTitle };

export const dynamic = 'force-dynamic';

/** Заведение наряда. Только владелец: монтажник наряды себе не выписывает. */
export default async function AdminOrderNewPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  /* Только работающие: назначать наряд человеку, у которого закрыт доступ,
     значит отправить его в пустоту — он не увидит наряд в панели. */
  const [clients, installers] = await Promise.all([listAll(), listInstallers(true)]);

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/orders' }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.addTitle}</h1>
        <p className={styles.lead}>{texts.addHint}</p>
      </header>

      <OrderEditor
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
        }))}
        installers={installers.map((staff) => ({
          id: staff.id,
          name: staff.name,
          login: staff.login,
          employment: staff.employment,
        }))}
      />
    </div>
  );
}
