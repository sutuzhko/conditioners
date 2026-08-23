import type { Metadata } from 'next';

import {
  CalendarGrid,
  DayPanel,
  MonthNav,
  crmContent as texts,
  type CalendarLead,
  type CrmEventDraft,
} from '@/features/crm-calendar';
import { formatPhone } from '@/shared/lib/format';
import {
  dayKeyOf,
  dayRange,
  gridRange,
  monthOfDay,
  parseDayKey,
  parseMonthKey,
  todayKey,
} from '@/shared/lib/calendar';
import { countOverdue, listRange } from '@/server/repo/crm';
import { findById, listCreatedBetween } from '@/server/repo/leads';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

type Search = {
  month?: string;
  day?: string;
  /** Заявка, из которой заводят дело: приходит из раздела заявок. */
  lead?: string;
};

/**
 * Календарь работ.
 *
 * Месяц и выбранный день живут в адресе: страница целиком собирается на
 * сервере, а открытый день переживает обновление страницы и возврат из
 * закладок. Заявки берутся из своего раздела — календарь их только
 * показывает, редактируются они там, где заведены.
 */
export default async function AdminCrmPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { month: monthParam, day: dayParam, lead: leadParam } = await searchParams;

  const now = new Date();
  const today = todayKey(now);

  // день главнее месяца: пришли по ссылке на день — показываем его месяц
  const day = (dayParam === undefined ? null : parseDayKey(dayParam)) ?? today;
  const month =
    (monthParam === undefined ? null : parseMonthKey(monthParam)) ??
    (dayParam === undefined ? monthOfDay(today) : monthOfDay(day));

  const grid = gridRange(month);
  const chosen = dayRange(day);

  const [events, leads, overdue, fromLead] = await Promise.all([
    listRange(grid.from, grid.to),
    listCreatedBetween(grid.from, grid.to),
    countOverdue(dayRange(today).from),
    leadParam === undefined ? Promise.resolve(null) : findById(leadParam),
  ]);

  const calendarLeads: CalendarLead[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    topic: lead.topic,
    at: lead.createdAt,
  }));

  const dayEvents = events.filter((event) => dayKeyOf(new Date(event.at)) === day);
  const dayLeads = calendarLeads.filter((lead) => {
    const at = Date.parse(lead.at);
    return at >= chosen.from.getTime() && at < chosen.to.getTime();
  });

  // заявка открывает форму уже заполненной: перебивать её данные руками —
  // лишняя работа и лишний повод ошибиться в телефоне
  const preset: Partial<CrmEventDraft> | undefined =
    fromLead === null
      ? undefined
      : {
          kind: 'call',
          clientName: fromLead.name,
          clientPhone: formatPhone(fromLead.phone),
          address: fromLead.address ?? '',
          note: fromLead.comment ?? '',
          leadId: fromLead.id,
        };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.body}>
        <div className={styles.calendar}>
          <MonthNav month={month} today={today} overdue={overdue} />
          <CalendarGrid
            month={month}
            selected={day}
            today={today}
            events={events}
            leads={calendarLeads}
          />
        </div>

        <DayPanel day={day} events={dayEvents} leads={dayLeads} preset={preset} />
      </div>
    </div>
  );
}
