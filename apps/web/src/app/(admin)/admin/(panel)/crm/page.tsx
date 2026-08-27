import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  CalendarGrid,
  CalendarNav,
  CalendarStage,
  TimeGrid,
  crmContent as texts,
  dayColumns,
  hourRangeOf,
  marksOf,
  monthColumns,
  parseCalendarView,
  parseTeamFlag,
  weekColumns,
  type CalendarLead,
  type CalendarView,
  type CrmEventDraft,
  type ScheduleSource,
} from '@/features/crm-calendar';
import { formatPhone } from '@/shared/lib/format';
import {
  dayRange,
  gridRange,
  minutesOfDay,
  monthOfDay,
  parseDayKey,
  parseMonthKey,
  todayKey,
  weekRange,
} from '@/shared/lib/calendar';
import { getAdminSession } from '@/server/auth';
import { listInstallers } from '@/server/repo/admin-users';
import { countOverdue, listOrdersRange, listRange } from '@/server/repo/crm';
import { listRange as listBlocks } from '@/server/repo/day-blocks';
import { findById, listCreatedBetween } from '@/server/repo/leads';
import { workWindow } from '@/server/repo/settings';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

type Search = {
  month?: string;
  day?: string;
  /** Вид календаря: `month` · `week` · `day` (инвариант 17). */
  view?: string;
  /** Наложение занятости команды: `on` включает (ADR-123). */
  team?: string;
  /** Заявка, из которой заводят дело: приходит из раздела заявок. */
  lead?: string;
};

/**
 * Какой промежуток выбирать из базы: месячная сетка листается месяцами,
 * недельная — неделями, а день смотрит одни сутки.
 *
 * Границы считает календарь в поясе работ: контейнер живёт в UTC, и «сутки»,
 * взятые сервером, начинались бы в три часа ночи по Москве (ADR-080).
 */
function rangeOf(view: CalendarView, month: string, day: string) {
  if (view === 'month') return gridRange(month);
  if (view === 'week') return weekRange(day);
  return dayRange(day);
}

/**
 * Календарь работ — модель Apple Calendar (ADR-128, CRM §3.5.1).
 *
 * Вид, дата и наложение занятости живут в адресе: страница целиком собирается
 * на сервере, а открытый экран переживает обновление и возврат из закладок.
 * Заявки берутся из своего раздела, наряды — из своего: календарь их
 * показывает, а правятся они там, где заведены (ADR-093).
 */
export default async function AdminCrmPage({ searchParams }: { searchParams: Promise<Search> }) {
  const {
    month: monthParam,
    day: dayParam,
    view: viewParam,
    team: teamParam,
    lead: leadParam,
  } = await searchParams;

  /* Занятость и наряды личные, поэтому страница обязана знать, кто её открыл:
     владелец видит всех, монтажник — себя. Layout панели сюда без сессии не
     пускает, проверка здесь — от неожиданностей, а не вместо него. */
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  const now = new Date();
  const today = todayKey(now);
  const view = parseCalendarView(viewParam);

  /* 🔴 Наложение занятости команды доступно только владельцу: чужая занятость
     монтажнику не видна (ADR-095), и переключатель ему не показывается. */
  const canTeam = session.role === 'owner';
  const team = canTeam && parseTeamFlag(teamParam);

  // день главнее месяца: пришли по ссылке на день — показываем его месяц
  const day = (dayParam === undefined ? null : parseDayKey(dayParam)) ?? today;
  const month =
    (monthParam === undefined ? null : parseMonthKey(monthParam)) ??
    (dayParam === undefined ? monthOfDay(today) : monthOfDay(day));

  const range = rangeOf(view, month, day);
  const viewer = { role: session.role, userId: session.userId };

  const [events, leads, orders, blocks, overdue, fromLead, installers, window] = await Promise.all([
    listRange(range.from, range.to),
    listCreatedBetween(range.from, range.to),
    listOrdersRange(viewer, range.from, range.to),
    listBlocks(viewer, range.from, range.to),
    countOverdue(dayRange(today).from),
    leadParam === undefined ? Promise.resolve(null) : findById(leadParam),
    /* Список команды нужен только включённому наложению: без него это лишний
       запрос на каждое листание месяца. */
    team ? listInstallers(true) : Promise.resolve([]),
    /* 🔴 Рабочее окно — настройка `schedule` (ADR-138). Оно решает, куда сетка
       прокручена и какие часы помечены нерабочими, но не то, что можно
       завести: запись за границей окна создаётся обычным образом. */
    workWindow(),
  ]);

  const calendarLeads: CalendarLead[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    topic: lead.topic,
    at: lead.createdAt,
  }));

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

  const source: ScheduleSource = {
    events,
    orders,
    leads: calendarLeads,
    blocks,
    viewerId: session.userId,
    today,
    team: installers,
  };

  const legend = [...marksOf(installers).values()];
  const hours = hourRangeOf(window);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      {/* 🔴 Сетка внутри управляющего слоя остаётся серверной: `children`
          переезжают через границу как разметка, а действия раздаются
          контекстом — функция границу не переживает. */}
      <CalendarStage
        day={day}
        viewerId={session.userId}
        blocks={blocks}
        orders={orders}
        preset={preset}
      >
        <div className={styles.calendar}>
          <CalendarNav
            view={view}
            month={month}
            day={day}
            today={today}
            overdue={overdue}
            team={team}
            canTeam={canTeam}
          />

          {team && installers.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>{texts.teamEmpty}</p>
              <p className={styles.emptyText}>{texts.teamEmptyHint}</p>
            </div>
          ) : null}

          {view === 'month' ? <CalendarGrid columns={monthColumns(source, month)} /> : null}

          {view === 'week' ? (
            <TimeGrid
              columns={weekColumns(source, day)}
              view={view}
              range={hours}
              nowMin={minutesOfDay(now)}
              label={texts.weekLabel}
              team={legend}
            />
          ) : null}

          {view === 'day' ? (
            <TimeGrid
              columns={dayColumns(source, day)}
              view={view}
              range={hours}
              nowMin={minutesOfDay(now)}
              label={texts.dayLabel}
              team={legend}
            />
          ) : null}
        </div>
      </CalendarStage>
    </div>
  );
}
