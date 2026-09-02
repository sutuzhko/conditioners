import type { Metadata } from 'next';
import Link from 'next/link';

import {
  LEAD_STATUSES,
  LeadList,
  isLeadStatus,
  leadManagerContent as texts,
  type LeadStatus,
} from '@/features/lead-manager';
import { requireOwnerPage } from '@/server/guards';
import { listByStatus } from '@/server/repo/leads';
import { pageNumber } from '@/shared/lib/paging';
import { Pager } from '@/shared/ui';
import { DataBlock, RowsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Заявки с сайта.
 *
 * Фильтр по статусу и номер страницы — ссылками, а не состоянием на клиенте:
 * адрес выбранного статуса можно сохранить в закладки и вернуться к нему
 * завтра. Разбивка рисуется здесь, а не внутри списка: список интерактивен и
 * едет в браузер, а переход между страницами — обычная навигация по адресу.
 *
 * 🔴 Список — асинхронный блок (issue #334, #336): шапка и фильтры уходят в
 * браузер сразу, список приезжает отдельным куском потока на место своего
 * скелетона, а если запрос списка упал — ошибка стоит на его месте, и
 * навигация с фильтрами остаются рабочими. Проверка доступа при этом идёт до
 * первого чтения данных (ADR-095): блок рисуется только после неё.
 */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { status, page } = await searchParams;
  const selected = status !== undefined && isLeadStatus(status) ? status : undefined;

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
          aria-current={selected === undefined ? 'page' : undefined}
          href={{ pathname: '/admin/leads' }}
        >
          {texts.filterAll}
        </Link>

        {LEAD_STATUSES.map((value) => (
          <Link
            className={[styles.filter, selected === value ? styles.active : null]
              .filter(Boolean)
              .join(' ')}
            aria-current={selected === value ? 'page' : undefined}
            key={value}
            href={{ pathname: '/admin/leads', query: { status: value } }}
          >
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <DataBlock
        skeleton={<RowsSkeleton rows={4} className={styles.rowSkeleton} />}
        title={texts.loadFailed}
        note={blockErrorNote('/admin/leads')}
      >
        <LeadsBlock status={selected} page={pageNumber(page)} />
      </DataBlock>
    </div>
  );
}

/**
 * Список заявок со страницами — то, что приезжает отдельным куском потока.
 *
 * Обёртка `data-block` — единственный узел блока, не зависящий от данных: по
 * нему сквозные сценарии находят кусок потока и меряют его положение.
 */
async function LeadsBlock({
  status,
  page,
}: {
  readonly status: LeadStatus | undefined;
  readonly page: number;
}) {
  const found = await listByStatus({ status, page });

  return (
    <div className={styles.block} data-block="leads">
      <LeadList leads={found.items} filtered={status !== undefined} />

      <Pager
        page={found.page}
        pages={found.pages}
        basePath="/admin/leads"
        query={status === undefined ? undefined : { status }}
      />
    </div>
  );
}
