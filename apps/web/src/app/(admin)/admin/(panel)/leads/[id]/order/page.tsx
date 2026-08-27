import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { guessOrderType, leadManagerContent as texts } from '@/features/lead-manager';
import { emptyOrderDraft, type OrderDraft } from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById } from '@/server/repo/leads';

import { OrderEditor } from '../../../orders/OrderEditor';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.orderTitle };

export const dynamic = 'force-dynamic';

/**
 * Черновик наряда по обращению — CRM.md §3.4.
 *
 * 🔴 Данные приходят адресом, а не вторым механизмом: страница читает
 * обращение по идентификатору из пути и складывает из него готовый черновик,
 * который принимает та же форма, что и раздел заказов. Клиента и статус
 * обращения к этому моменту уже перевёл `POST /api/admin/leads/{id}/order` —
 * страница только читает, потому что переход по ссылке не должен ничего
 * менять в базе.
 *
 * Если обращение открыли напрямую, без этого действия, клиент останется
 * невыбранным: форма спросит его сама, а придумывать за неё нечего.
 */
export default async function AdminLeadOrderPage({ params }: { params: Promise<{ id: string }> }) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { id } = await params;
  const lead = await findById(id);
  if (lead === null) notFound();

  /* Только работающие: назначать наряд человеку с закрытым доступом значит
     отправить его в пустоту — он не увидит наряд в панели. */
  const [clients, installers] = await Promise.all([listAll(), listInstallers(true)]);

  const draft: OrderDraft = {
    ...emptyOrderDraft(),
    type: guessOrderType(lead.topic),
    clientId: lead.clientId ?? '',
    address: lead.address ?? '',
    comment: lead.comment ?? '',
    leadId: lead.id,
  };

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/leads' }}>
        {texts.orderBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.orderTitle}</h1>
        <p className={styles.from}>{texts.orderFrom(lead.name, lead.topic)}</p>
        <p className={styles.lead}>{texts.orderLead}</p>
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
        initial={draft}
        title={texts.orderFormTitle}
        hint={texts.orderFormHint}
      />
    </div>
  );
}
