/**
 * Цены монтажа по классам и ставки допуслуг — docs/API.md §4.
 *
 * Ставки лежат в настройках (`Setting.extras`), строки прайса — отдельной
 * таблицей: их владелец правит как таблицу, целиком.
 */
import { db } from '@/server/db';
import { getExtras, putGroup, type Extras } from '@/server/repo/settings';
import type { PricesUpdate } from '@/entities/price/model';

export type PriceRowDto = {
  cls: string;
  power: string;
  area: string;
  price: number;
  term: string;
  sort: number;
};

export type PricesDto = {
  prices: PriceRowDto[];
  extras: Extras | null;
};

/* Ответ собирается проекцией, а не строкой Prisma целиком: иначе наружу
   уезжают `id`, `createdAt` и `updatedAt`, которых нет в примере API §4.
   Вреда от них нет, но контракт — это то, что описано, а не то, что вышло. */
const priceSelect = {
  cls: true,
  power: true,
  area: true,
  price: true,
  term: true,
  sort: true,
} as const;

export async function getPrices(): Promise<PricesDto> {
  const [rows, extras] = await Promise.all([
    db.priceRow.findMany({ select: priceSelect, orderBy: [{ sort: 'asc' }, { cls: 'asc' }] }),
    getExtras(),
  ]);

  return { prices: rows, extras };
}

/**
 * Прайс заменяется целиком: строку удаляют, добавляют и переставляют местами
 * в одной форме, и промежуточное состояние с половиной классов недопустимо.
 */
export async function replacePrices(input: PricesUpdate): Promise<PricesDto> {
  await db.$transaction(async (tx) => {
    const keep = input.prices.map((row) => row.cls);
    await tx.priceRow.deleteMany({ where: { cls: { notIn: keep } } });

    for (const [index, row] of input.prices.entries()) {
      await tx.priceRow.upsert({
        where: { cls: row.cls },
        create: { ...row, sort: index },
        update: { ...row, sort: index },
      });
    }

    /* Ставки — в той же транзакции: по паре «прайс + ставки» считает смету
       калькулятор, и рассинхрон после частичного сбоя показал бы клиенту
       цену, которую по телефону не подтвердят (аудит, BUGS). */
    await putGroup('extras', input.extras, tx);
  });

  return getPrices();
}
