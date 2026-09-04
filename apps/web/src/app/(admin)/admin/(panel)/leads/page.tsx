import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import {
  LEAD_STATUSES,
  LeadDetail,
  LeadQueue,
  LeadSearch,
  LeadStale,
  isLeadStatus,
  leadManagerContent as texts,
  leadsHref,
  type LeadQueueItem,
  type LeadStatus,
} from '@/features/lead-manager';
import { requireOwnerPage } from '@/server/guards';
import { findById, listByStatus, queueCounts } from '@/server/repo/leads';
import { pageNumber } from '@/shared/lib/paging';
import { Card, EmptyState, Pager } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { LeadsSkeleton, SummarySkeleton } from './LeadsSkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

type LeadsParams = { status?: string; page?: string; lead?: string; q?: string };

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

  const { status, page, lead, q } = await searchParams;
  const selected = status !== undefined && isLeadStatus(status) ? status : undefined;
  const current = pageNumber(page);
  const query = q?.trim() ?? '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
      </header>

      {/* 🔴 Строка счёта и плашка о залежавшемся обращении считаются одним
          запросом и приезжают вместе: два асинхронных блока звали бы одни и те
          же четыре счётчика дважды.

          🔴 Свой кусок потока, но БЕЗ своей границы ошибки: у раздела она одна
          и стоит на очереди. Со второй границей недоступная база рисовала
          «Не удалось загрузить заявки» дважды — над фильтрами и в списке, — а
          человек читает это как две разные поломки. Счёт — принадлежность
          заголовка, а не содержимое раздела: не сложился — раздел обходится
          без него, и об отказе говорит блок очереди с повтором. */}
      <Suspense fallback={<SummarySkeleton />}>
        <QueueSummary />
      </Suspense>

      <LeadSearch query={query} status={selected} />

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
        <LeadsBlock status={selected} page={current} lead={lead} query={query} />
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
  query,
}: {
  readonly status: LeadStatus | undefined;
  readonly page: number;
  readonly lead: string | undefined;
  readonly query: string;
}) {
  /* 🔴 Открытое обращение читается своим запросом, а не ищется в текущей
     странице очереди: ссылка на обращение приходит извне — из письма, из
     мессенджера, — и оно может лежать на четвёртой странице другого статуса.
     Пропавшее обращение не роняет раздел: очередь остаётся на месте. */
  const [found, opened] = await Promise.all([
    listByStatus({ status, page, query }),
    lead === undefined || lead === '' ? Promise.resolve(null) : findById(lead),
  ]);

  const queue: readonly LeadQueueItem[] = found.items.map((item) => ({
    id: item.id,
    number: item.number,
    name: item.name,
    phone: item.phone,
    topic: item.topic,
    address: item.address,
    status: item.status,
    createdAt: item.createdAt,
  }));

  /* 🔴 Одно «сейчас» на всю очередь: относительное время считается от него, а
     не от `Date.now()` в каждой строке — иначе две соседние строки меряются
     разными мгновениями. */
  const now = new Date();

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
          query={query}
          filtered={status !== undefined || query !== ''}
          now={now}
        />

        <Pager
          page={found.page}
          pages={found.pages}
          basePath="/admin/leads"
          query={{
            ...(status === undefined ? {} : { status }),
            ...(query === '' ? {} : { q: query }),
          }}
          numbers
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

/**
 * Счёт очереди и плашка о залежавшемся обращении (issue #601).
 *
 * Считается в базе, а не по странице очереди: на экране восемь строк, а
 * залежавшееся обращение лежит на четвёртой — именно поэтому оно и залежалось.
 *
 * 🔴 Отказ базы гасится здесь, а не поднимается к границе. Ошибка раздела
 * одна, и она принадлежит очереди: там есть и объяснение, и повтор. Вторая
 * плашка над фильтрами сообщала бы о той же поломке второй раз, и владелец
 * читал бы две. Счёт — украшение заголовка: без него раздел работает.
 */
async function QueueSummary() {
  const counts = await countsOrNull();
  if (counts === null) return null;

  return (
    <div className={styles.summary}>
      <p className={styles.lead}>
        {counts.fresh === 0 ? texts.countEmpty : texts.count(counts.fresh, counts.stale)}
      </p>

      {counts.oldest === null ? null : (
        <LeadStale number={counts.oldest.number} leadId={counts.oldest.id} />
      )}
    </div>
  );
}

/** Счётчики очереди или `null`, если база не ответила (см. `QueueSummary`). */
async function countsOrNull(): Promise<Awaited<ReturnType<typeof queueCounts>> | null> {
  try {
    return await queueCounts();
  } catch {
    return null;
  }
}
