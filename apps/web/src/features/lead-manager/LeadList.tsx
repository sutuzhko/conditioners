'use client';

import { useRouter } from 'next/navigation';

import { Card } from '@/shared/ui';

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
    return (
      <Card as="section" className={styles.empty}>
        <h2 className={styles.emptyTitle}>{filtered ? texts.emptyFiltered : texts.emptyTitle}</h2>
        {filtered ? null : <p className={styles.emptyText}>{texts.emptyText}</p>}
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
          onOrder={(leadId) => router.push(`/admin/leads/${leadId}/order`)}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}
