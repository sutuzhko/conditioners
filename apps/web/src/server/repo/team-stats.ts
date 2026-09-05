/**
 * Показатели раздела «Монтажники»: загрузка недели и итоги месяца (issue #602,
 * #629, ADR-310).
 *
 * 🔴 Всё считается из уже имеющихся данных, и своего поля в базе загрузка не
 * получает (ADR-310). У наряда есть `durationMin` и `overtimeMin`, рабочее
 * окно владелец задаёт (ADR-138) — этого достаточно. Колонка «часов за
 * неделю» рядом с суммой по нарядам неизбежно разошлась бы с ней, и верить
 * стало бы нечему; если запрос окажется дорог, ответом будет кеш, а не
 * колонка.
 *
 * Отдельный модуль, а не строки в `repo/orders`: там доступ к нарядам, здесь —
 * сводка по людям, и читает её только раздел команды.
 */
import type { Prisma } from '@prisma/client';

import { db } from '@/server/db';
import { workWindow } from '@/server/repo/settings';
import { momentOf, monthKeyOf, shiftMonth, todayKey, weekRange } from '@/shared/lib/calendar';

/** Полночь дня — граница периода в поясе работ, а не в поясе сервера (ADR-080). */
const DAY_START = '00:00';

/**
 * Сколько рабочих дней в неделе.
 *
 * 🔴 Пять, и это не настройка — потому что настройки такой нет. Рабочее окно
 * (ADR-138) описывает часы дня, но не дни недели; выдумать шестой рабочий день
 * значит выдумать факт о компании (инвариант 8). Пятидневка — то, из чего
 * исходит владелец, называя норму: она же стоит в макете плиткой «из 40».
 * Появится настройка недели — норма станет считаться по ней, и место правки
 * ровно одно.
 */
const WORK_DAYS_IN_WEEK = 5;

export type InstallerLoad = {
  readonly installerId: string;
  /** Минуты нарядов недели вместе с переработкой. */
  readonly minutes: number;
  /** Минуты за границей рабочего окна: их видно отдельно (ADR-138). */
  readonly overtimeMin: number;
};

export type WeekLoad = {
  /** Норма недели в минутах: рабочее окно × пять дней. */
  readonly normMin: number;
  readonly byInstaller: ReadonlyMap<string, InstallerLoad>;
};

/**
 * Загрузка недели по каждому монтажнику.
 *
 * Считаются наряды, назначенные на неделю, а не только выполненные: загрузка
 * отвечает на вопрос «кому можно дать ещё выезд», а он про план, а не про
 * факт. Отказы из счёта выпадают — за отменённый наряд никто не едет.
 */
export async function weekLoad(now: Date = new Date()): Promise<WeekLoad> {
  /* Границы недели — общие на проект (`shared/lib/calendar`): та же неделя,
     которую рисует календарь работ, начинается с понедельника по Москве. */
  const { from, to } = weekRange(todayKey(now));

  const [window, rows] = await Promise.all([
    workWindow(),
    db.order.findMany({
      where: {
        installerId: { not: null },
        status: { not: 'CANCELLED' },
        at: { gte: from, lt: to },
      },
      select: { installerId: true, durationMin: true, overtimeMin: true },
    }),
  ]);

  const byInstaller = new Map<string, InstallerLoad>();

  for (const row of rows) {
    /* Наряд без исполнителя отобран запросом, но типы Prisma этого не знают:
       колонка необязательная, и проверка здесь — не перестраховка. */
    if (row.installerId === null) continue;

    const current = byInstaller.get(row.installerId);
    byInstaller.set(row.installerId, {
      installerId: row.installerId,
      minutes: (current?.minutes ?? 0) + row.durationMin,
      overtimeMin: (current?.overtimeMin ?? 0) + row.overtimeMin,
    });
  }

  return { normMin: (window.toMin - window.fromMin) * WORK_DAYS_IN_WEEK, byInstaller };
}

export type TeamMonth = {
  /** Выполнено нарядов за месяц. */
  readonly done: number;
  /** Насколько это больше или меньше прошлого месяца. */
  readonly donePrev: number;
  /** Начислено монтажникам по выполненным нарядам, в рублях. */
  readonly paid: number;
  /** Сколько удержаний и на какую сумму — «не штраф», а удержание (ADR-114). */
  readonly deductions: number;
  readonly deductionSum: number;
};

/**
 * Итоги месяца для плиток раздела (issue #602).
 *
 * Месяц берётся календарный и в поясе работ: владелец сверяет эти цифры с
 * расчётом по людям, а тот идёт по календарю, а не по последним тридцати дням.
 */
export async function teamMonth(now: Date = new Date()): Promise<TeamMonth> {
  const month = monthKeyOf(now);
  const range = (key: string): Prisma.DateTimeFilter => ({
    gte: momentOf(`${key}-01`, DAY_START),
    lt: momentOf(`${shiftMonth(key, 1)}-01`, DAY_START),
  });

  const doneWhere: Prisma.OrderWhereInput = { status: 'DONE', at: range(month) };

  const [done, donePrev, fees, deductions] = await Promise.all([
    db.order.count({ where: doneWhere }),
    db.order.count({ where: { status: 'DONE', at: range(shiftMonth(month, -1)) } }),
    db.order.aggregate({ where: doneWhere, _sum: { installerFee: true } }),
    db.order.aggregate({
      where: { at: range(month), deductionSum: { gt: 0 } },
      _sum: { deductionSum: true },
      _count: true,
    }),
  ]);

  return {
    done,
    donePrev,
    paid: fees._sum.installerFee ?? 0,
    deductions: deductions._count,
    deductionSum: deductions._sum.deductionSum ?? 0,
  };
}

export type InstallerTally = {
  /** Выполнено нарядов за всё время. */
  readonly done: number;
  /** Начислено по выполненным нарядам, в рублях. */
  readonly earned: number;
  /** Удержано, в рублях. Из заработанного не вычтено (ADR-114). */
  readonly deductionSum: number;
  /**
   * Сколько нарядов за человеком всего, в любом статусе. По нему список
   * решает, можно ли удалить учётную запись: наряд без исполнителя не
   * остаётся (та же проверка, что в «Опасной зоне» карточки).
   */
  readonly orders: number;
};

const EMPTY_TALLY: InstallerTally = { done: 0, earned: 0, deductionSum: 0, orders: 0 };

/**
 * Итоги по всем монтажникам разом (issue #602).
 *
 * 🔴 Группировкой, а не вызовом `installerTotals` в цикле: пять человек в
 * команде дали бы двадцать запросов к базе ради одной таблицы, и число
 * запросов росло бы вместе с командой. Здесь их два независимо от размера.
 *
 * Заработано — по выполненным нарядам: наряд, до которого ещё не доехали,
 * денег не принёс. Удержания считаются по всем нарядам: удержание за срыв
 * относится и к тому, который так и не сделали.
 */
export async function installerTally(): Promise<ReadonlyMap<string, InstallerTally>> {
  const [done, held, all] = await Promise.all([
    db.order.groupBy({
      by: ['installerId'],
      where: { installerId: { not: null }, status: 'DONE' },
      _count: { _all: true },
      _sum: { installerFee: true },
    }),
    db.order.groupBy({
      by: ['installerId'],
      where: { installerId: { not: null }, deductionSum: { gt: 0 } },
      _sum: { deductionSum: true },
    }),
    db.order.groupBy({
      by: ['installerId'],
      where: { installerId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const tally = new Map<string, InstallerTally>();

  /* Три группировки складываются в одну запись на человека: заводим её при
     первом упоминании и дописываем недостающие поля. */
  const merge = (id: string, patch: Partial<InstallerTally>): void => {
    tally.set(id, { ...(tally.get(id) ?? EMPTY_TALLY), ...patch });
  };

  for (const row of done) {
    if (row.installerId === null) continue;
    merge(row.installerId, { done: row._count._all, earned: row._sum.installerFee ?? 0 });
  }

  for (const row of held) {
    if (row.installerId === null) continue;
    merge(row.installerId, { deductionSum: row._sum.deductionSum ?? 0 });
  }

  for (const row of all) {
    if (row.installerId === null) continue;
    merge(row.installerId, { orders: row._count._all });
  }

  return tally;
}
