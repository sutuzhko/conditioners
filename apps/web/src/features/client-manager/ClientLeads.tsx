import Link from 'next/link';

import { Badge, Card } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import { LEAD_STATUS_VARIANT, leadStatusTitle, type ClientLead } from './model';
import styles from './ClientLeads.module.css';

export interface ClientLeadsProps {
  readonly leads: readonly ClientLead[];
}

/**
 * Обращения этого человека.
 *
 * Только напоминание о разговоре: тема, дата и статус. Полная карточка
 * обращения со всем, что клиент прислал, живёт в разделе заявок — второе
 * место, где заявку можно править, означало бы две правды об одном статусе.
 */
export function ClientLeads({ leads }: ClientLeadsProps) {
  return (
    <Card as="section" className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>{texts.leadsTitle}</h2>
        <p className={styles.hint}>{texts.leadsHint}</p>
      </header>

      {leads.length === 0 ? (
        <p className={styles.empty}>{texts.leadsEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {leads.map((lead) => (
            <li className={styles.item} key={lead.id}>
              <div className={styles.line}>
                <span className={styles.topic}>{lead.topic}</span>
                <Badge variant={LEAD_STATUS_VARIANT[lead.status]} size="sm">
                  {leadStatusTitle(lead.status)}
                </Badge>
                <time className={styles.when} dateTime={lead.createdAt}>
                  {texts.date(lead.createdAt)}
                </time>
              </div>

              {lead.comment === null ? null : <p className={styles.comment}>{lead.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      <Link className={styles.all} href={{ pathname: '/admin/leads' }}>
        {texts.leadsOpen} →
      </Link>
    </Card>
  );
}
