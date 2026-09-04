import type { Metadata } from 'next';
import Link from 'next/link';

import {
  LEAD_STATUSES,
  LeadDetail,
  LeadQueue,
  isLeadStatus,
  leadManagerContent as texts,
  leadsHref,
  type LeadQueueItem,
  type LeadStatus,
} from '@/features/lead-manager';
import { requireOwnerPage } from '@/server/guards';
import { findById, listByStatus } from '@/server/repo/leads';
import { pageNumber } from '@/shared/lib/paging';
import { Card, EmptyState, Pager } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { LeadsSkeleton } from './LeadsSkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

type LeadsParams = { status?: string; page?: string; lead?: string };

/**
 * Заявки с сайта — очередь слева, карточка обращения справа (issue #349).
 *
 * 🔴 Выбранное обращение живёт в адресе, а не в состоянии компонента: ссылку
 * на обращение пересылают коллеге, а на узком экране, где карточка занимает
 * весь экран, «назад» браузера обязано возвращать к очереди — не выбрасывать
 * из раздела (ADR-255, ADR-258).
 *
 * 🔴 Раскладка решается на сервере разметкой, а не медиазапросом по данным:
 * до 900px видно ровно одно из двух — очередь либо карточка, — и что именно,
 * говорит наличие `lead` в адресе. Ниже 900 колонка одна, выше — две.
 *
 * 🔴 Очередь — асинхронный блок (issue #334, #336): шапка и фильтры уходят в
 * браузер сразу, очередь с карточкой приезжают отдельным куском потока на
 * место заготовки, а упавший запрос показывает ошибку на их месте, оставляя
 * навигацию рабочей. Проверка доступа при этом идёт до первого чтения данных
 * (ADR-095): блок рисуется только после неё.
 */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<LeadsParams>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { status, page, lead } = await searchParams;
  const selected = status !== undefined && isLeadStatus(status) ? status : undefined;
  const current = pageNumber(page);

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
          href={leadsHref({})}
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
            href={leadsHref({ status: value })}
          >
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <DataBlock
        skeleton={<LeadsSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote('/admin/leads')}
      >
        <LeadsBlock status={selected} page={current} lead={lead} />
      </DataBlock>
    </div>
  );
}

/**
 * Очередь и карточка — то, что приезжает отдельным куском потока.
 *
 * Обёртка `data-block` — единственный узел блока, не зависящий от данных: по
 * нему сквозные сценарии находят кусок потока и меряют его положение.
 */
async function LeadsBlock({
  status,
  page,
  lead,
}: {
  readonly status: LeadStatus | undefined;
  readonly page: number;
  readonly lead: string | undefined;
}) {
  /* 🔴 Открытое обращение читается своим запросом, а не ищется в текущей
     странице очереди: ссылка на обращение приходит извне — из письма, из
     мессенджера, — и оно может лежать на четвёртой странице другого статуса.
     Пропавшее обращение не роняет раздел: очередь остаётся на месте. */
  const [found, opened] = await Promise.all([
    listByStatus({ status, page }),
    lead === undefined || lead === '' ? Promise.resolve(null) : findById(lead),
  ]);

  const queue: readonly LeadQueueItem[] = found.items.map((item) => ({
    id: item.id,
    name: item.name,
    phone: item.phone,
    topic: item.topic,
    status: item.status,
    createdAt: item.createdAt,
  }));

  return (
    <div
      className={styles.split}
      data-block="leads"
      /* Атрибут решает раскладку до 900px: открытая карточка занимает экран
         целиком, закрытая уступает его очереди. */
      data-selected={opened === null ? undefined : ''}
    >
      <div className={styles.queue}>
        <LeadQueue
          leads={queue}
          selected={opened?.id}
          status={status}
          page={page}
          filtered={status !== undefined}
        />

        <Pager
          page={found.page}
          pages={found.pages}
          basePath="/admin/leads"
          query={status === undefined ? undefined : { status }}
        />
      </div>

      <div className={styles.detail}>
        {opened === null ? (
          <Card as="section">
            <EmptyState icon="leads" title={texts.pickTitle}>
              {texts.pickText}
            </EmptyState>
          </Card>
        ) : (
          <>
            {/* Путь назад к очереди виден только там, где очередь скрыта. */}
            <Link className={styles.back} href={leadsHref({ status, page })} scroll={false}>
              {texts.queueBack}
            </Link>

            <LeadDetail lead={opened} />
          </>
        )}
      </div>
    </div>
  );
}
