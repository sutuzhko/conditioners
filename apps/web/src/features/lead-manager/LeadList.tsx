'use client';

import { useRouter } from 'next/navigation';

import { ButtonLink, Card, EmptyState } from '@/shared/ui';

import { LeadCardView } from './LeadCardView';
import { leadManagerContent as texts } from './content';
import { leadToClient, leadToOrder, patchLead } from './lib';
import type { LeadCard } from './model';
import styles from './LeadList.module.css';

export interface LeadListProps {
  readonly leads: readonly LeadCard[];
  /** Выбран фильтр по статусу: пустой список тогда объясняется иначе. */
  readonly filtered?: boolean | undefined;
}

/** Список заявок. Каждая правится на месте — переходить некуда и незачем. */
export function LeadList({ leads, filtered = false }: LeadListProps) {
  const router = useRouter();

  if (leads.length === 0) {
    /* 🔴 Пусто и «ничего не найдено» — разные состояния с противоположными
       шагами (issue #335). Фильтр живёт в адресе, поэтому сброс — ссылка, а
       не обработчик: он работает и без единой строки JavaScript. */
    return (
      <Card as="section">
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
    <div className={styles.list}>
      {leads.map((lead) => (
        <LeadCardView
          key={lead.id}
          lead={lead}
          update={patchLead}
          toClient={leadToClient}
          toOrder={leadToOrder}
          /* Черновик наряда живёт своей страницей: раздел заявок не знает
             ни полей наряда, ни списка монтажников. */
          onOrder={(leadId) => router.push(`/admin/orders/new?lead=${leadId}`)}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}
