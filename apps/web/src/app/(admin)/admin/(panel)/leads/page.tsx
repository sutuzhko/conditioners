import type { Metadata } from 'next';
import Link from 'next/link';

import {
  LEAD_STATUSES,
  LeadList,
  isLeadStatus,
  leadManagerContent as texts,
} from '@/features/lead-manager';
import { requireOwnerPage } from '@/server/guards';
import { listByStatus } from '@/server/repo/leads';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Заявки с сайта.
 *
 * Фильтр по статусу — ссылками, а не состоянием на клиенте: адрес выбранного
 * статуса можно сохранить в закладки и вернуться к нему завтра.
 */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { status } = await searchParams;
  const selected = status !== undefined && isLeadStatus(status) ? status : undefined;
  const leads = await listByStatus(selected);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <nav className={styles.filters} aria-label={texts.filterLabel}>
        <Link
          className={[styles.filter, selected === undefined ? styles.active : null]
            .filter(Boolean)
            .join(' ')}
          href={{ pathname: '/admin/leads' }}
        >
          {texts.filterAll}
        </Link>

        {LEAD_STATUSES.map((value) => (
          <Link
            className={[styles.filter, selected === value ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            key={value}
            href={{ pathname: '/admin/leads', query: { status: value } }}
          >
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <LeadList leads={leads} filtered={selected !== undefined} />
    </div>
  );
}
