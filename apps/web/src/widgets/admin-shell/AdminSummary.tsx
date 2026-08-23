import Link from 'next/link';

import { Badge, Card } from '@/shared/ui';

import { adminSummaryContent as texts } from './summary-content';
import styles from './AdminSummary.module.css';

export type SummaryCounts = {
  /** Заявок в статусе «новая» — то, ради чего владелец заходит в панель. */
  readonly newLeads: number;
  /** Отзывов на модерации. */
  readonly pendingReviews: number;
  readonly models: number;
  readonly articles: number;
};

export type ReadinessSummary = {
  readonly ready: boolean;
  /** Группы настроек, где ещё стоит заглушка или пусто обязательное поле. */
  readonly unfinished: readonly string[];
};

/**
 * Дело из календаря в том виде, в каком его показывает сводка.
 *
 * Название вида и день приходят готовыми строками: сводка не знает ни видов
 * дел, ни часового пояса работ — за них отвечает календарь.
 */
export type UpcomingEvent = {
  readonly id: string;
  readonly when: string;
  readonly kind: string;
  readonly clientName: string;
  readonly overdue: boolean;
};

export interface AdminSummaryProps {
  readonly counts: SummaryCounts;
  readonly readiness: ReadinessSummary;
  readonly upcoming?: readonly UpcomingEvent[] | undefined;
}

/**
 * Сводка на входе в панель: что требует внимания прямо сейчас.
 *
 * Порядок блоков — по срочности, а не по алфавиту разделов: заявка ждёт
 * человека, незаполненные данные компании держат запуск, остальное терпит.
 */
export function AdminSummary({ counts, readiness, upcoming = [] }: AdminSummaryProps) {
  return (
    <div className={styles.summary}>
      <Card
        as="section"
        variant={readiness.ready ? 'soft' : 'accent'}
        className={styles.readiness}
        aria-labelledby="readiness-title"
      >
        <h2 className={styles.cardTitle} id="readiness-title">
          {texts.readinessTitle}
        </h2>

        {readiness.ready ? (
          <p className={styles.text}>{texts.readinessDone}</p>
        ) : (
          <>
            <p className={styles.text}>{texts.readinessPending}</p>
            <ul className={styles.groups}>
              {readiness.unfinished.map((group) => (
                <li key={group}>
                  <Badge variant="warning">{texts.groupTitle(group)}</Badge>
                </li>
              ))}
            </ul>
            <Link className={styles.link} href={{ pathname: '/admin/company' }}>
              {texts.readinessCta}
            </Link>
          </>
        )}
      </Card>

      {/* Что делать сегодня — выше того, сколько чего заведено: за цифрами
          каталога в панель не заходят, а за «кому позвонить» — да. */}
      <Card as="section" className={styles.upcoming} aria-labelledby="upcoming-title">
        <h2 className={styles.cardTitle} id="upcoming-title">
          {texts.upcomingTitle}
        </h2>

        {upcoming.length === 0 ? (
          <p className={styles.text}>{texts.upcomingEmpty}</p>
        ) : (
          <ul className={styles.events}>
            {upcoming.map((event) => (
              <li className={styles.event} key={event.id}>
                <span className={styles.eventWhen}>{event.when}</span>
                <span className={styles.eventKind}>{event.kind}</span>
                <span className={styles.eventName}>{event.clientName}</span>
                {event.overdue ? <Badge variant="warning">{texts.upcomingOverdue}</Badge> : null}
              </li>
            ))}
          </ul>
        )}

        <Link className={styles.link} href={{ pathname: '/admin/crm' }}>
          {texts.upcomingCta}
        </Link>
      </Card>

      <div className={styles.tiles}>
        <SummaryTile
          href="/admin/leads"
          title={texts.leads}
          value={counts.newLeads}
          note={texts.leadsNote}
          urgent={counts.newLeads > 0}
        />
        <SummaryTile
          href="/admin/reviews"
          title={texts.reviews}
          value={counts.pendingReviews}
          note={texts.reviewsNote}
          urgent={counts.pendingReviews > 0}
        />
        <SummaryTile
          href="/admin/catalog"
          title={texts.models}
          value={counts.models}
          note={texts.modelsNote}
        />
        <SummaryTile
          href="/admin/knowledge"
          title={texts.articles}
          value={counts.articles}
          note={texts.articlesNote}
        />
      </div>
    </div>
  );
}

function SummaryTile({
  href,
  title,
  value,
  note,
  urgent = false,
}: {
  href: string;
  title: string;
  value: number;
  note: string;
  urgent?: boolean;
}) {
  return (
    <Link className={styles.tile} href={{ pathname: href }}>
      <span className={styles.tileTitle}>{title}</span>
      {/* Цифра выделяется только когда она требует действия: подсвеченный
          ноль ничего не значит, а подсвеченное всё — то же самое. */}
      <span className={[styles.tileValue, urgent ? styles.urgent : null].filter(Boolean).join(' ')}>
        {value}
      </span>
      <span className={styles.tileNote}>{note}</span>
    </Link>
  );
}
