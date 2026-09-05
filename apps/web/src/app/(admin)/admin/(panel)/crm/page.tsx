import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  CalendarGrid,
  CalendarNav,
  CalendarStage,
  TeamFilter,
  TimeGrid,
  WeekBoard,
  crmContent as texts,
  dayColumns,
  hourRangeOf,
  marksOf,
  monthColumns,
  parseCalendarView,
  parseKinds,
  parseTeamFlag,
  parseWho,
  teamLoad,
  weekColumns,
  type CalendarLead,
  type CalendarView,
  type CrmEventDraft,
  type ScheduleFilter,
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
import { getAdminSession, isOwner } from '@/server/auth';
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
  /** Кого видно в слое: `who=u2,u3`. Нет параметра — всех (issue #49). */
  who?: string;
  /** `kinds=orders,leads` — какие виды записей показывать (issue #49). */
  kinds?: string;
  /** Заявка, из которой заводят дело: приходит из раздела заявок. */
  lead?: string;
  /** Найденная поиском запись: её подсвечивают в сетке (issue #132). */
  focus?: string;
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
    who: whoParam,
    kinds: kindsParam,
    lead: leadParam,
    focus: focusParam,
  } = await searchParams;

  /* Занятость и наряды личные, поэтому страница обязана знать, кто её открыл:
     владелец видит всех, монтажник — себя. Layout панели сюда без сессии не
     пускает, проверка здесь — от неожиданностей, а не вместо него. */
  const session = await getAdminSession();
  if (session === null) redirect('/admin/login');

  const now = new Date();
  const today = todayKey(now);
  const view = parseCalendarView(viewParam);

  /* 🔴 Право владельца — одно на весь экран: наложение занятости команды
     (ADR-095, переключатель монтажнику не показывается), дела, заявки и
     заготовка дела из заявки. Две проверки одного и того же разошлись бы. */
  const owner = isOwner(session);
  const team = owner && parseTeamFlag(teamParam);

  /* 🔴 Состав слоя существует только вместе со слоем (issue #49): выключенный
     не должен нести за собой список, о котором человек не помнит, — и
     монтажнику он не достаётся вовсе, как и сам слой (ADR-095). Виды записей
     от слоя не зависят: ими прячут заявки и дела и с выключенным слоем. */
  const who = team ? parseWho(whoParam) : null;
  const kinds = parseKinds(kindsParam);
  const filter: ScheduleFilter = { who: who === null ? null : new Set(who), kinds };

  // день главнее месяца: пришли по ссылке на день — показываем его месяц
  const day = (dayParam === undefined ? null : parseDayKey(dayParam)) ?? today;
  const month =
    (monthParam === undefined ? null : parseMonthKey(monthParam)) ??
    (dayParam === undefined ? monthOfDay(today) : monthOfDay(day));

  const range = rangeOf(view, month, day);
  const viewer = { role: session.role, userId: session.userId };

  /* 🔴 Дела и заявки в календарь монтажника не попадают вовсе (CRM §6): у
     `CrmEvent` исполнителя нет, а заявка везёт имя, телефон и адрес клиента.
     Разграничение стоит в самих выборках — сюда роль приезжает `viewer`, и
     обойти её, забыв условие на странице, нельзя. Заготовка из заявки закрыта
     здесь: за `?lead=` идёт чтение по номеру, роли не знающее. */
  const [events, leads, orders, blocks, overdue, fromLead, installers, window] = await Promise.all([
    listRange(viewer, range.from, range.to),
    listCreatedBetween(viewer, range.from, range.to),
    listOrdersRange(viewer, range.from, range.to),
    listBlocks(viewer, range.from, range.to),
    countOverdue(viewer, dayRange(today).from),
    leadParam === undefined || !owner ? Promise.resolve(null) : findById(leadParam),
    /* 🔴 Список команды нужен всегда, а не только включённому слою: карточка
       «Показывать» и подзаголовок раздела называют состав постоянно (макет
       `design/admin/Calendar.body.html`), и без списка галочку нечем зажечь.
       Монтажнику команда закрыта (ADR-095) — ему запрос и не идёт. */
    owner ? listInstallers(true) : Promise.resolve([]),
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
    filter,
  };

  const legend = [...marksOf(installers).values()];
  const hours = hourRangeOf(window);
  /* Часы считаются по всем нарядам промежутка, а не по показанным: цифра
     рядом с выключенным человеком обязана остаться прежней. */
  const load = teamLoad(orders, installers);

  /* Место целиком: из него собираются и переходы шапки, и адреса фильтра. */
  const place = {
    view,
    month,
    day,
    today,
    team,
    who: who === null ? null : [...who],
    kinds: kinds === null ? null : [...kinds],
  };

  return (
    <div className={styles.page}>
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
            who={place.who}
            kinds={place.kinds}
            canTeam={owner}
            teamSize={installers.length}
            workFromMin={hours.workFromMin}
            workToMin={hours.workToMin}
          />

          {/* 🔴 Карточка «Показывать» слева от сетки — макет
              `design/admin/Calendar.body.html`. Список людей в ней и легенда, и
              фильтр слоя, и его переключатель разом: отдельной кнопки над
              сеткой макет не знает, а две кнопки на одно состояние — это ровно
              то, на что владелец и пожаловался. Монтажнику карточки нет:
              команда ему закрыта (ADR-095). */}
          <div
            className={[styles.board, owner ? null : styles.boardWide].filter(Boolean).join(' ')}
          >
            {owner ? (
              <TeamFilter
                place={place}
                team={legend}
                load={load}
                workFromMin={hours.workFromMin}
                workToMin={hours.workToMin}
              />
            ) : null}

            <div className={styles.sheet}>
              {owner && installers.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>{texts.teamEmpty}</p>
                  <p className={styles.emptyText}>{texts.teamEmptyHint}</p>
                </div>
              ) : null}

              {view === 'month' ? (
                <CalendarGrid columns={monthColumns(source, month)} focusId={focusParam} />
              ) : null}

              {/* 🔴 Неделя на телефоне складывается в повестку (issue #47):
                  семь колонок в 375px дают сорок пикселей на день, и от записи
                  остаётся один символ. Выбор между сеткой и списком делает CSS —
                  ширины окна сервер не знает. */}
              {view === 'week' ? (
                <WeekBoard
                  columns={weekColumns(source, day)}
                  range={hours}
                  nowMin={minutesOfDay(now)}
                  focusId={focusParam}
                />
              ) : null}

              {view === 'day' ? (
                <TimeGrid
                  columns={dayColumns(source, day)}
                  view={view}
                  range={hours}
                  nowMin={minutesOfDay(now)}
                  label={texts.dayLabel}
                  focusId={focusParam}
                />
              ) : null}
            </div>
          </div>
        </div>
      </CalendarStage>
    </div>
  );
}
