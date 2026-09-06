import type { Metadata } from 'next';
import Link from 'next/link';

import { cache } from 'react';

import {
  StaffList,
  StaffSearch,
  TEAM_NEW_PATH,
  TEAM_PATH,
  staffManagerContent as texts,
  staffTitle,
  type StaffRowStats,
} from '@/features/staff-manager';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/admin-users';
import { installerTally, teamMonth, weekLoad } from '@/server/repo/team-stats';
import { formatMoney, formatNumber } from '@/shared/lib/format';
import { Skeleton, StatTile, StatTiles, buttonClassName } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { TeamSkeleton } from './TeamSkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Команда (issue #602, макет `Team.png`).
 *
 * 🔴 Заведение монтажника ушло в окно с собственным адресом (ADR-117):
 * свёрнутая форма над списком уводила карточки вниз ровно тогда, когда на них
 * смотрят. Кнопка «Добавить» — ссылка, а не состояние: окно открывается адресом.
 *
 * 🔴 Загрузка и деньги считаются из нарядов, своего поля в базе у них нет
 * (ADR-310, issue #629): `durationMin`, `overtimeMin` и рабочее окно уже
 * описывают неделю целиком, а вторая цифра о том же неизбежно разошлась бы с
 * первой.
 *
 * Читаем `repo` напрямую, а не своим же HTTP-запросом к `/api/admin/staff`:
 * страница и так серверная, лишний круг через сеть — лишний способ отказать.
 *
 * 🔴 Заготовки раздела живут внутри страницы, а не в `loading.tsx` (issue
 * #651). Заготовка на границе раздела уходила в ответ первой и уносила с
 * собой код 200: `notFound()` карточки уволенного человека менял потом лишь
 * тело. Здесь до первого байта доходит только разбор адреса.
 */
export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: TEAM_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        {/* Строка счёта вместо прозы (макет `Team.png`): раздел открывают,
            чтобы узнать, кто сегодня на смене.

            Свой кусок потока: строка стоит над плитками, и ждать ради неё
            наряды за месяц значит держать пустым весь экран. Заготовка
            занимает ту же строку — плитки под ней не двигаются (ADR-239). */}
        <DataBlock
          surface="bare"
          skeleton={<Skeleton variant="text" width="14ch" />}
          title={texts.loadFailed}
          note={blockErrorNote(TEAM_PATH)}
        >
          <TeamCount />
        </DataBlock>
      </header>

      <DataBlock
        skeleton={<TeamSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(TEAM_PATH)}
      >
        <TeamBody query={query} />
      </DataBlock>
    </div>
  );
}

/**
 * Список людей панели — один поход в базу на все куски потока.
 *
 * 🔴 `cache` React держит результат в пределах одного запроса: счёт в шапке и
 * таблица команды читают один и тот же список, и второй `SELECT` за теми же
 * строками не ускорил бы ничего, зато счёт «на смене из пяти» мог бы
 * разойтись с тем, что показывает таблица под ним.
 */
const staffOfPanel = cache(list);

/** Счёт смены — свой кусок потока: строка стоит над плитками и таблицей. */
async function TeamCount() {
  const staff = await staffOfPanel();
  const installers = staff.filter((person) => person.role === 'installer');
  const active = installers.filter((person) => person.active).length;

  return <p className={styles.lead}>{texts.count(active, installers.length)}</p>;
}

/**
 * Плитки месяца, поиск и таблица команды — то, что приезжает отдельным куском
 * потока.
 *
 * Фрагмент, а не обёртка: блоки страницы стоят колонкой с общим зазором, и
 * лишний `<div>` сдвинул бы таблицу относительно того, что показала заготовка.
 */
async function TeamBody({ query }: { readonly query: string }) {
  const [staff, load, tally, month] = await Promise.all([
    staffOfPanel(),
    weekLoad(),
    installerTally(),
    teamMonth(),
  ]);

  const installers = staff.filter((person) => person.role === 'installer');

  /* 🔴 Поиск отбирается здесь, а не запросом к базе. Команда — это единицы
     человек, и список уже прочитан целиком ради плиток и средней загрузки:
     второй запрос за теми же строками ничего не ускорит, зато счёт «на смене
     из пяти» перестал бы совпадать с тем, что показывает шапка. */
  const needle = query.toLowerCase();
  const found =
    needle === ''
      ? staff
      : staff.filter((person) => {
          if (person.role !== 'installer') return false;

          return [staffTitle(person), person.login, person.phone ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle);
        });

  const stats = new Map<string, StaffRowStats>(
    installers.map((person) => {
      const week = load.byInstaller.get(person.id);
      const totals = tally.get(person.id);

      return [
        person.id,
        {
          loadMin: week?.minutes ?? 0,
          normMin: load.normMin,
          overtimeMin: week?.overtimeMin ?? 0,
          done: totals?.done ?? 0,
          earned: totals?.earned ?? 0,
          deductionSum: totals?.deductionSum ?? 0,
          orders: totals?.orders ?? 0,
        },
      ];
    }),
  );

  /* Средняя загрузка — по тем, у кого доступ открыт: человек с закрытым
     доступом в среднее не входит, иначе плитка занижает её на уволенных. */
  const working = installers.filter((person) => person.active);
  const averageMin =
    working.length === 0
      ? 0
      : Math.round(
          working.reduce((sum, person) => sum + (stats.get(person.id)?.loadMin ?? 0), 0) /
            working.length,
        );

  const doneDelta = month.done - month.donePrev;

  return (
    <>
      <StatTiles label={texts.tilesMonthLabel}>
        <StatTile
          label={texts.tileMonthDone}
          value={formatNumber(month.done)}
          {...(doneDelta === 0
            ? {}
            : {
                delta: {
                  trend: doneDelta > 0 ? ('up' as const) : ('down' as const),
                  value: `${doneDelta > 0 ? '+' : '−'}${formatNumber(Math.abs(doneDelta))}`,
                },
              })}
        />

        <StatTile label={texts.tileMonthPaid} value={formatMoney(month.paid)} />

        {/* 🔴 «Удержаний», а не «штрафов»: штрафов как вида взыскания в ТК РФ
            нет (ADR-114). Сумма стоит рядом с числом — одно без другого не
            отвечает, о каких деньгах речь. */}
        <StatTile
          label={texts.tileMonthHeld}
          value={formatNumber(month.deductions)}
          note={texts.tileMonthHeldNote(month.deductionSum)}
          {...(month.deductionSum === 0
            ? {}
            : {
                delta: {
                  trend: 'down' as const,
                  value: formatMoney(month.deductionSum),
                  tone: 'danger' as const,
                },
              })}
        />

        <StatTile
          label={texts.tileMonthLoad}
          value={texts.hours(averageMin)}
          note={texts.tileMonthLoadNote(Math.round(load.normMin / 60))}
        />
      </StatTiles>

      <StaffSearch query={query} />

      <StaffList staff={found} stats={stats} query={query} />
    </>
  );
}
