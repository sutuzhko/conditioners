/**
 * Скидка на модель — контракт docs/API.md §3, ADR-011.
 *
 * 🔴 Отдельным файлом, а не рядом с `model.ts`, ради бюджета JS (ADR-088).
 * Схему зовёт один маршрут админки, но `model.ts` импортируют карточка товара
 * и первый экран — и всё, что объявлено в нём значением, уезжает в бандл
 * лендинга. Проверка периода добавила туда 0,4 КБ и вывела главную за порог:
 * 75,1 КБ при 75. Правило админки весило на публичной странице, где исполнять
 * его некому.
 */
import { z } from 'zod';

import { moscowDate } from '@/shared/lib/zod';

import { optionalText } from './model';

/**
 * Скидка задаётся конечной ценой и периодом (ADR-011). `salePrice: null`
 * снимает скидку.
 *
 * 🔴 Процента в схеме нет: он вычисляется из цен. Возможность прислать
 * «скидку 40%» — это возможность нарисовать её (инвариант 14).
 */
export const saleInputSchema = z
  .object({
    salePrice: z.coerce.number().int().positive().nullable(),
    // граница «до» — конец дня по Туле, иначе скидка пропадёт утром последнего дня
    saleFrom: moscowDate('start').optional(),
    saleTo: moscowDate('end').optional(),
    saleLabel: optionalText,
  })
  .strict()
  .superRefine((value, ctx) => {
    /* 🔴 Перевёрнутый период сервер принимал молча, и скидка после этого не
       включалась никогда: `withinPeriod` при `from > to` не пропускает ни одного
       мгновения. Товар на витрине оставался без скидки, а в панели она значилась
       заданной — владелец узнавал об этом от покупателя, а не от формы.

       Ошибка вешается на «до»: это то поле, которое человек правит последним. */
    // поле может отсутствовать вовсе или прийти пустым — сравнивать не с чем
    const from = value.saleFrom ?? null;
    const to = value.saleTo ?? null;
    if (from === null || to === null) return;

    if (from.getTime() > to.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['saleTo'],
        message: 'Конец акции раньше её начала',
      });
    }
  });

export type SaleInput = z.infer<typeof saleInputSchema>;
