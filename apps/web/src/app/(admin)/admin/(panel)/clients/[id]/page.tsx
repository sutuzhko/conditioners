import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ClientForm,
  ClientLeads,
  clientManagerContent as texts,
  type ClientLead,
} from '@/features/client-manager';
import { requireOwnerPage } from '@/server/guards';
import { findById } from '@/server/repo/clients';
import { listByClient } from '@/server/repo/leads';
import { formatPhone, phoneHref } from '@/shared/lib/format';

import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const client = await findById(id);

  return { title: client === null ? texts.title : client.name };
}

/** Карточка клиента: данные, правка и обращения этого человека. */
export default async function AdminClientPage({ params }: PageProps) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { id } = await params;

  const [client, leads] = await Promise.all([findById(id), listByClient(id)]);
  if (client === null) notFound();

  /* Заявке в карточке клиента нужно ровно то, чем вспоминают разговор: всё
     остальное — включая согласие на обработку — живёт в разделе заявок. */
  const history: readonly ClientLead[] = leads.map((lead) => ({
    id: lead.id,
    topic: lead.topic,
    status: lead.status,
    comment: lead.comment,
    createdAt: lead.createdAt,
  }));

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/clients' }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{client.name}</h1>
        <p className={styles.meta}>
          <a className={styles.phone} href={phoneHref(client.phone)}>
            {formatPhone(client.phone)}
          </a>
          <span>{texts.since(client.createdAt)}</span>
          <span>{texts.leadCount(client.leadCount)}</span>
        </p>
      </header>

      <ClientForm
        clientId={client.id}
        initial={{
          name: client.name,
          phone: client.phone,
          address: client.address ?? '',
          note: client.note ?? '',
        }}
        title={texts.cardTitle}
        hint={texts.cardHint}
        removable
      />

      <ClientLeads leads={history} />
    </div>
  );
}
