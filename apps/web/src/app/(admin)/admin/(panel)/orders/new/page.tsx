import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { guessOrderType, leadManagerContent as leadTexts } from '@/features/lead-manager';
import {
  emptyOrderDraft,
  orderManagerContent as texts,
  type OrderDraft,
} from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById as findLead } from '@/server/repo/leads';
import { todayKey } from '@/shared/lib/calendar';

import { loadBlocks, loadWork } from '../blocks';
import { OrderEditor } from '../OrderEditor';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.addTitle };

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ lead?: string }> };

/**
 * Заведение наряда. Только владелец: монтажник наряды себе не выписывает.
 *
 * 🔴 Наряд из обращения заводится здесь же, параметром `?lead=`, а не отдельной
 * страницей в разделе заявок: форма и правила у наряда одни, и второй их копии
 * быть не должно — она разошлась бы с первой на первой же правке. Обращение
 * задаёт черновик, а не свой экран.
 *
 * Клиента и статус обращения к этому моменту уже перевёл
 * `POST /api/admin/leads/{id}/order` — страница только читает: переход по
 * ссылке не должен ничего менять в базе. Если адрес открыли напрямую, минуя
 * действие, клиент останется невыбранным: форма спросит его сама, а
 * придумывать за неё нечего.
 */
export default async function AdminOrderNewPage({ searchParams }: PageProps) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  const session = await requireOwnerPage();

  const { lead: leadId } = await searchParams;
  const lead = leadId === undefined ? null : await findLead(leadId);
  if (leadId !== undefined && lead === null) notFound();

  /* Только работающие: назначать наряд человеку, у которого закрыт доступ,
     значит отправить его в пустоту — он не увидит наряд в панели. */
  const [clients, installers, blocks, work] = await Promise.all([
    listAll(),
    listInstallers(true),
    /* Занятость вокруг сегодняшнего дня: наряд заводят, пока клиент на линии,
       и чаще всего на ближайшие дни. */
    loadBlocks(session, todayKey()),
    loadWork(session, todayKey()),
  ]);

  const draft: OrderDraft | undefined =
    lead === null
      ? undefined
      : {
          ...emptyOrderDraft(),
          type: guessOrderType(lead.topic),
          clientId: lead.clientId ?? '',
          address: lead.address ?? '',
          comment: lead.comment ?? '',
          leadId: lead.id,
        };

  return (
    <div className={styles.page}>
      <Link
        className={styles.back}
        href={{ pathname: lead === null ? '/admin/orders' : '/admin/leads' }}
      >
        {lead === null ? texts.back : leadTexts.orderBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{lead === null ? texts.addTitle : leadTexts.orderTitle}</h1>
        {lead !== null && (
          <p className={styles.from}>{leadTexts.orderFrom(lead.name, lead.topic)}</p>
        )}
        <p className={styles.lead}>{lead === null ? texts.addHint : leadTexts.orderLead}</p>
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
        blocks={blocks}
        work={work}
        {...(draft === undefined
          ? {}
          : { initial: draft, title: leadTexts.orderFormTitle, hint: leadTexts.orderFormHint })}
      />
    </div>
  );
}
