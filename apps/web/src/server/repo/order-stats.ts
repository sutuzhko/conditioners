/**
 * Деньги месяца по нарядам — сегмент «Деньги» сводки (issue #344).
 *
 * 🔴 Источник тот же, что у списка заказов: поля `price`, `installerFee` и
 * `deductionSum` самих нарядов. Отдельного отчёта с собственными правилами
 * подсчёта здесь нет намеренно — иначе выручка в сводке однажды разошлась бы
 * с суммой в таблице, и объяснить владельцу, какое из чисел настоящее, было
 * бы нечем.
 *
 * 🔴 Ни закупочных цен, ни себестоимости, ни маржи. Их в базе нет вовсе:
 * позиция склада цены не хранит, и решение владельца по ним не принято
 * (CRM.md §11.7). Считать «расход материалов в рублях» здесь не из чего, и
 * подставлять вместо него выдуманный коэффициент нельзя.
 *
 * Считается по выполненным нарядам месяца: выручка — это сделанная работа, а
 * не выставленный план. Отказ в неё не попадает по построению.
 */
import type { OrderType as DbType } from '@prisma/client';

import type { OrderType } from '@/entities/order/model';
import { momentOf, shiftMonth, type MonthKey } from '@/shared/lib/calendar';

import { db } from '../db';

const TYPE_FROM_DB: Record<DbType, OrderType> = {
  INSTALL: 'install',
  SERVICE: 'service',
  REPAIR: 'repair',
};

/** Полночь первого дня месяца — в поясе работ, а не в поясе сервера. */
function monthRange(month: MonthKey): { readonly gte: Date; readonly lt: Date } {
  return {
    gte: momentOf(`${month}-01`, '00:00'),
    lt: momentOf(`${shiftMonth(month, 1)}-01`, '00:00'),
  };
}

/** Доля вида работ в выручке месяца: «из чего сложилась». */
export type MoneyShare = {
  readonly type: OrderType;
  readonly sum: number;
  /** Целые проценты: доли процента в этом разговоре ничего не решают. */
  readonly percent: number;
};

/** Столбик недели: неделя месяца и выручка по ней. */
export type MoneyWeek = {
  /** Подпись деления: «1–7», «8–14». */
  readonly label: string;
  readonly sum: number;
};

export type MonthMoney = {
  /** Сумма выполненных нарядов месяца. */
  readonly revenue: number;
  /** Сколько нарядов её дали: по нему считается средний чек. */
  readonly done: number;
  /** Средний чек, округлённый до рубля. Ноль работ — ноль. */
  readonly average: number;
  /** К выплате бригадам: вознаграждение за вычетом удержаний. */
  readonly payout: number;
  /** Из выручки принято наличными на объекте — эти деньги ещё нужно забрать. */
  readonly cash: number;
  readonly shares: readonly MoneyShare[];
  readonly weeks: readonly MoneyWeek[];
};

/** Границы недель месяца по дням: последняя тянется до конца месяца. */
const WEEK_STARTS = [1, 8, 15, 22] as const;

function weekIndexOf(day: number): number {
  if (day >= 22) return 3;
  if (day >= 15) return 2;
  if (day >= 8) return 1;
  return 0;
}

/**
 * Деньги месяца.
 *
 * 🔴 Один запрос, а не пять агрегатов. Выручка, средний чек, выплаты, доли по
 * видам работ и столбики недель считаются по одному и тому же набору строк —
 * выполненным нарядам месяца, — и пять отдельных `aggregate` дали бы пять
 * снимков базы, между которыми успевает пройти чужая правка. Объём ограничен
 * месяцем: это десятки строк, а не история за годы.
 */
export async function monthMoney(month: MonthKey): Promise<MonthMoney> {
  const range = monthRange(month);

  const rows = await db.order.findMany({
    where: { status: 'DONE', at: range },
    select: {
      at: true,
      type: true,
      price: true,
      installerFee: true,
      deductionSum: true,
      payment: true,
    },
  });

  const byType = new Map<OrderType, number>();
  const weeks = WEEK_STARTS.map(() => 0);

  let revenue = 0;
  let payout = 0;
  let cash = 0;

  for (const row of rows) {
    const type = TYPE_FROM_DB[row.type];

    revenue += row.price;
    payout += Math.max(row.installerFee - row.deductionSum, 0);
    if (row.payment === 'CASH_TO_INSTALLER') cash += row.price;

    byType.set(type, (byType.get(type) ?? 0) + row.price);

    /* День берётся в поясе работ: наряд, закрытый в три часа ночи первого
       числа по Москве, принадлежит этому месяцу и этой неделе, а не UTC. */
    const day = Number.parseInt(
      row.at.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' }).slice(8),
      10,
    );
    const index = weekIndexOf(day);
    weeks[index] = (weeks[index] ?? 0) + row.price;
  }

  const shares = [...byType.entries()]
    .map(([type, sum]) => ({
      type,
      sum,
      percent: revenue === 0 ? 0 : Math.round((sum / revenue) * 100),
    }))
    .sort((left, right) => right.sum - left.sum);

  return {
    revenue,
    done: rows.length,
    average: rows.length === 0 ? 0 : Math.round(revenue / rows.length),
    payout,
    cash,
    shares,
    weeks: WEEK_STARTS.map((start, index) => ({
      label: index === WEEK_STARTS.length - 1 ? `${start}–…` : `${start}–${start + 6}`,
      sum: weeks[index] ?? 0,
    })),
  };
}
