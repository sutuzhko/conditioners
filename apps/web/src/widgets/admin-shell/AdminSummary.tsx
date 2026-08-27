import Link from 'next/link';

import { Badge, Card } from '@/shared/ui';

import { adminSummaryContent as texts } from './summary-content';
import styles from './AdminSummary.module.css';

/**
 * Цифры сводки — про работу компании, а не про содержимое сайта (CRM.md §3.8).
 *
 * Владелец заходит в панель утром за пятью вопросами: кто написал, что сегодня
 * везём, сколько людей в базе, кто из монтажников на связи и не ждёт ли ответа
 * отзыв. Сколько статей в Базе знаний — вопрос вечера пятницы, и на входном
 * экране он занимал место молча.
 */
export type SummaryCounts = {
  /** Заявок в статусе «новая» — то, ради чего владелец заходит в панель. */
  readonly newLeads: number;
  /** Наряды в работе: назначенные и те, где монтажник уже на объекте. */
  readonly activeOrders: number;
  /** Людей в базе клиентов. */
  readonly clients: number;
  /** Монтажников с открытым доступом в панель. */
  readonly installers: number;
  /** Отзывов на модерации. */
  readonly pendingReviews: number;
};

export type ReadinessSummary = {
  readonly ready: boolean;
  /** Группы настроек, где ещё стоит заглушка или пусто обязательное поле. */
  readonly unfinished: readonly string[];
};

/**
 * 🔴 Наряд и дело — разные сущности с разным смыслом (ADR-093): наряд это
 * работа с деньгами и исполнителем, дело — напоминание позвонить. В общем
 * списке они идут вперемешку по времени, но помечены по-разному: сводка, в
 * которой одно неотличимо от другого, врёт о том, что предстоит сделать.
 */
export type UpcomingNature = 'order' | 'event';

/**
 * Строка «Ближайших дел» в том виде, в каком её показывает сводка.
 *
 * Все подписи приходят готовыми: сводка не знает ни видов дел, ни типов
 * нарядов, ни часового пояса работ — за них отвечают их разделы.
 */
export type UpcomingItem = {
  readonly id: string;
  readonly nature: UpcomingNature;
  /** «сегодня 18:00», «завтра 10:00», «14 июля, 09:00». */
  readonly when: string;
  /** Что это: «Монтаж», «Звонок». */
  readonly kind: string;
  readonly clientName: string;
  /** Куда ведёт строка: наряд — в свою карточку, дело — в календарь. */
  readonly href: string;
  readonly overdue: boolean;
};

export interface AdminSummaryProps {
  readonly counts: SummaryCounts;
  readonly readiness: ReadinessSummary;
  readonly upcoming?: readonly UpcomingItem[] | undefined;
}

/**
 * Сводка на входе в панель: что требует внимания прямо сейчас.
 *
 * Порядок блоков — по срочности. Пока данные компании не заполнены, сайт
 * публиковать нельзя, и готовность стоит первой; как только заполнены, она
 * уходит вниз тихой строкой — держать наверху зелёную галочку значит каждый
 * день отодвигать ею работу.
 */
export function AdminSummary({ counts, readiness, upcoming = [] }: AdminSummaryProps) {
  const readinessCard = (
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
  );

  return (
    <div className={styles.summary}>
      {readiness.ready ? null : readinessCard}

      <div className={styles.tiles}>
        <SummaryTile
          href="/admin/leads"
          title={texts.leads}
          value={counts.newLeads}
          note={texts.leadsNote}
          urgent={counts.newLeads > 0}
        />
        <SummaryTile
          href="/admin/orders"
          title={texts.orders}
          value={counts.activeOrders}
          note={texts.ordersNote}
        />
        <SummaryTile
          href="/admin/clients"
          title={texts.clients}
          value={counts.clients}
          note={texts.clientsNote}
        />
        <SummaryTile
          href="/admin/team"
          title={texts.installers}
          value={counts.installers}
          note={texts.installersNote}
        />
        <SummaryTile
          href="/admin/reviews"
          title={texts.reviews}
          value={counts.pendingReviews}
          note={texts.reviewsNote}
          urgent={counts.pendingReviews > 0}
        />
      </div>

      {/* Что делать сегодня — ниже цифр, но выше всего остального: за «кому
          ехать и кому звонить» в панель заходят каждый день. */}
      <Card as="section" className={styles.upcoming} aria-labelledby="upcoming-title">
        <h2 className={styles.cardTitle} id="upcoming-title">
          {texts.upcomingTitle}
        </h2>
        <p className={styles.text}>{texts.upcomingNote}</p>

        {upcoming.length === 0 ? (
          <p className={styles.text}>{texts.upcomingEmpty}</p>
        ) : (
          <ul className={styles.events}>
            {upcoming.map((item) => (
              <li className={styles.event} key={`${item.nature}-${item.id}`}>
                <Link className={styles.eventLink} href={{ pathname: item.href }}>
                  <span className={styles.eventWhen}>{item.when}</span>
                  {/* Природа записи — словом и плашкой, а не одним цветом:
                      наряд и дело различаются деньгами, и путать их нельзя
                      даже в монохромном режиме. */}
                  <Badge size="sm" variant={item.nature === 'order' ? 'accent' : 'neutral'}>
                    {texts.natureTitle(item.nature)}
                  </Badge>
                  <span className={styles.eventKind}>{item.kind}</span>
                  <span className={styles.eventName}>{item.clientName}</span>
                  {item.overdue ? <Badge variant="warning">{texts.upcomingOverdue}</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link className={styles.link} href={{ pathname: '/admin/crm' }}>
          {texts.upcomingCta}
        </Link>
      </Card>

      {readiness.ready ? readinessCard : null}
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
