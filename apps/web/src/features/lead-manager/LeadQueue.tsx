import Link from 'next/link';

import { LEAD_STATUS_VARIANT } from '@/entities/lead/model';
import { Badge, Card, EmptyState, ButtonLink } from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { leadsHref, type LeadQueueItem, type LeadStatus } from './model';
import styles from './LeadQueue.module.css';

export interface LeadQueueProps {
  readonly leads: readonly LeadQueueItem[];
  /** Открытое обращение: строка отмечается `aria-current`, а не только краской. */
  readonly selected?: string | undefined;
  /** Действующий фильтр и страница: они переезжают в ссылку каждой строки. */
  readonly status?: LeadStatus | undefined;
  readonly page?: number | undefined;
  /** Выбран фильтр по статусу: пустая очередь тогда объясняется иначе. */
  readonly filtered?: boolean | undefined;
}

/**
 * Очередь обращений — левая колонка раздела (issue #349).
 *
 * 🔴 Серверный компонент: выбор живёт в адресе, поэтому строка — обычная
 * ссылка. Своего JS у очереди нет вовсе, а «назад» браузера возвращает к
 * предыдущему обращению, а не выбрасывает из раздела.
 *
 * В строке ровно то, по чему выбирают, кому звонить: имя, тема, статус и
 * когда пришло. Всё остальное — в карточке справа.
 */
export function LeadQueue({ leads, selected, status, page, filtered = false }: LeadQueueProps) {
  if (leads.length === 0) {
    /* 🔴 Пусто и «ничего не найдено» — разные состояния с противоположными
       шагами (issue #335). Фильтр живёт в адресе, поэтому сброс — ссылка, а
       не обработчик: он работает и без единой строки JavaScript. */
    return (
      <Card as="section" className={styles.empty}>
        {filtered ? (
          <EmptyState
            icon="search"
            title={texts.emptyFiltered}
            action={
              <ButtonLink href="/admin/leads" size="sm" variant="bordered">
                {texts.emptyFilteredAction}
              </ButtonLink>
            }
          >
            {texts.emptyFilteredText}
          </EmptyState>
        ) : (
          <EmptyState
            icon="leads"
            title={texts.emptyTitle}
            action={
              <ButtonLink href="/admin/notifications" size="sm" variant="bordered">
                {texts.emptyAction}
              </ButtonLink>
            }
          >
            {texts.emptyText}
          </EmptyState>
        )}
      </Card>
    );
  }

  return (
    <Card as="nav" className={styles.queue} padding="none" aria-label={texts.queueLabel}>
      <ul className={styles.list}>
        {leads.map((lead) => {
          const current = lead.id === selected;

          return (
            <li key={lead.id}>
              <Link
                className={[styles.row, current ? styles.current : null].filter(Boolean).join(' ')}
                href={leadsHref({ status, page, lead: lead.id })}
                aria-current={current ? 'page' : undefined}
                /* Прокрутка не сбрасывается: обращения перебирают, стоя в
                   середине очереди (ADR-258). */
                scroll={false}
              >
                <span className={styles.line}>
                  <span className={styles.name}>{lead.name}</span>
                  <Badge variant={LEAD_STATUS_VARIANT[lead.status]} size="sm">
                    {texts.statusTitle(lead.status)}
                  </Badge>
                </span>

                <span className={styles.topic}>{lead.topic}</span>

                <time className={styles.when} dateTime={lead.createdAt}>
                  {texts.when(lead.createdAt)}
                </time>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
