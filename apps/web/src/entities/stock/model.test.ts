// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  NEAR_LOW_RATIO,
  deltaSchema,
  isLow,
  isNearLow,
  isStockPeriod,
  movementDelta,
  orderConsumeSchema,
  quantitySchema,
  stockItemCreateSchema,
  stockItemUpdateSchema,
  stockMovementCreateSchema,
  stockZoneCreateSchema,
  stockZoneUpdateSchema,
  thresholdSchema,
  zoneOwnerIssue,
} from './model';

/**
 * Схемы склада — контракт docs/API.md §14, требования docs/CRM.md §11.
 *
 * 🔴 Проверяется то, чего не видно по остатку: разбор количеств, которые
 * человек пишет по-русски, набор полей каждого вида движения, потолки — и
 * разделение «поле не прислали» от «поле очистили», без которого `PATCH`
 * работал полной заменой.
 */

// ---------- Количества ----------

describe('количество из формы', () => {
  it('запятая — обычный русский разделитель, а не ошибка ввода', () => {
    expect(quantitySchema.parse('1,5')).toBe(1.5);
  });

  it('пробел между разрядами тоже пишут руками', () => {
    expect(quantitySchema.parse('12 000')).toBe(12_000);
    expect(quantitySchema.parse('12 000')).toBe(12_000);
  });

  it('число проходит как есть', () => {
    expect(quantitySchema.parse(4)).toBe(4);
  });

  it('пустое поле — это «не указали», и говорит об этом Zod', () => {
    const parsed = quantitySchema.safeParse('');

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.message).toBe('Укажите количество');
  });

  it('мусор отвергается сообщением про число, а не падает в NaN', () => {
    const parsed = quantitySchema.safeParse('полтора');

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.message).toBe('Количество — число');
  });

  it('ноль и минус — не количество: направление задают зоны', () => {
    expect(quantitySchema.safeParse(0).success).toBe(false);
    expect(quantitySchema.safeParse(-1).success).toBe(false);
  });

  it('🔴 три знака после запятой — предел колонки в базе', () => {
    expect(quantitySchema.safeParse('0,001').success).toBe(true);
    expect(quantitySchema.safeParse('0,0001').success).toBe(false);
    expect(quantitySchema.safeParse(43.5).success).toBe(true);
  });

  it('потолок количества — миллион', () => {
    expect(quantitySchema.safeParse(1_000_000).success).toBe(true);
    expect(quantitySchema.safeParse(1_000_001).success).toBe(false);
  });
});

describe('поправка инвентаризации', () => {
  it('знак свой: инвентаризация и добавляет, и убавляет', () => {
    expect(deltaSchema.parse('-2,5')).toBe(-2.5);
    expect(deltaSchema.parse('3')).toBe(3);
  });

  it('ноль запрещён: движение, ничего не меняющее, засоряет журнал', () => {
    expect(deltaSchema.safeParse(0).success).toBe(false);
  });

  it('потолок считается по модулю', () => {
    expect(deltaSchema.safeParse(-1_000_000).success).toBe(true);
    expect(deltaSchema.safeParse(-1_000_001).success).toBe(false);
  });
});

describe('порог заказа', () => {
  it('пустое поле означает «за позицией не следим»', () => {
    expect(thresholdSchema.parse('')).toBe(0);
    expect(thresholdSchema.parse(null)).toBe(0);
    expect(thresholdSchema.parse(undefined)).toBe(0);
  });

  it('отрицательного порога не бывает', () => {
    expect(thresholdSchema.safeParse(-1).success).toBe(false);
  });
});

// ---------- Позиция справочника ----------

const ITEM = { name: 'Труба медная 1/4', unit: 'meter' };

describe('позиция справочника', () => {
  it('минимум — название и единица, остальное пусто', () => {
    const parsed = stockItemCreateSchema.parse(ITEM);

    expect(parsed.group).toBeNull();
    expect(parsed.productId).toBeNull();
    expect(parsed.note).toBeNull();
    expect(parsed.minQty).toBe(0);
  });

  it('единица берётся только из словаря проекта', () => {
    expect(stockItemCreateSchema.safeParse({ ...ITEM, unit: 'метр' }).success).toBe(false);
    expect(stockItemCreateSchema.safeParse({ ...ITEM, unit: 'cylinder' }).success).toBe(true);
  });

  it('название обязательно и не длиннее ста двадцати символов', () => {
    expect(stockItemCreateSchema.safeParse({ ...ITEM, name: '  ' }).success).toBe(false);
    expect(stockItemCreateSchema.safeParse({ ...ITEM, name: 'т'.repeat(121) }).success).toBe(false);
  });
});

describe('🔴 правка позиции — частичная, а не полная замена', () => {
  it('пришло одно поле — в теле остаётся одно поле', () => {
    const parsed = stockItemUpdateSchema.parse({ name: 'Труба медная 3/8' });

    expect(Object.keys(parsed)).toEqual(['name']);
  });

  it('опущенный порог не превращается в ноль: «за позицией больше не следим»', () => {
    const parsed = stockItemUpdateSchema.parse({ note: 'Осталось на складе' });

    expect('minQty' in parsed).toBe(false);
  });

  it('опущенный `archived` не возвращает позицию из архива', () => {
    const parsed = stockItemUpdateSchema.parse({ name: 'Труба' });

    expect('archived' in parsed).toBe(false);
  });

  it('присланное пустым — это очистка, и она остаётся различимой', () => {
    const parsed = stockItemUpdateSchema.parse({ group: '', note: '' });

    expect(parsed.group).toBeNull();
    expect(parsed.note).toBeNull();
  });

  it('пустое тело отвергается: сохранять нечего', () => {
    expect(stockItemUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('посторонних полей схема не принимает', () => {
    expect(stockItemUpdateSchema.safeParse({ name: 'Труба', total: 100 }).success).toBe(false);
  });
});

// ---------- Зона хранения ----------

describe('зона хранения', () => {
  it('🔴 машина без хозяина не заводится: монтажник видит свою по этой связи', () => {
    const parsed = stockZoneCreateSchema.safeParse({ kind: 'van', name: 'Газель' });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.path).toEqual(['userId']);
  });

  it('🔴 склад человеку не принадлежит', () => {
    const parsed = stockZoneCreateSchema.safeParse({
      kind: 'warehouse',
      name: 'Гараж',
      userId: 'u2',
    });

    expect(parsed.success).toBe(false);
  });

  it('согласованные пары проходят, а порядок по умолчанию нулевой', () => {
    expect(stockZoneCreateSchema.parse({ kind: 'warehouse', name: 'Гараж' }).sort).toBe(0);
    expect(
      stockZoneCreateSchema.safeParse({ kind: 'van', name: 'Газель', userId: 'u2' }).success,
    ).toBe(true);
  });

  it('правило пары одно на схему и на репозиторий', () => {
    expect(zoneOwnerIssue('van', null)).toBe('Выберите, чья это машина');
    expect(zoneOwnerIssue('warehouse', 'u2')).toBe('Склад не принадлежит человеку');
    expect(zoneOwnerIssue('van', 'u2')).toBeNull();
    expect(zoneOwnerIssue('warehouse', null)).toBeNull();
  });
});

describe('🔴 правка зоны — частичная', () => {
  it('переименование не обнуляет порядок и не поднимает зону из архива', () => {
    const parsed = stockZoneUpdateSchema.parse({ name: 'Гараж на Мира' });

    expect(Object.keys(parsed)).toEqual(['name']);
  });

  it('половина пары проходит: вторую знает только база', () => {
    expect(stockZoneUpdateSchema.safeParse({ kind: 'warehouse' }).success).toBe(true);
    expect(stockZoneUpdateSchema.safeParse({ userId: '' }).success).toBe(true);
  });

  it('противоречие в одном запросе не проходит', () => {
    expect(stockZoneUpdateSchema.safeParse({ kind: 'van', userId: '' }).success).toBe(false);
    expect(stockZoneUpdateSchema.safeParse({ kind: 'warehouse', userId: 'u2' }).success).toBe(
      false,
    );
  });

  it('пустое тело отвергается', () => {
    expect(stockZoneUpdateSchema.safeParse({}).success).toBe(false);
  });
});

// ---------- Движения ----------

describe('вид движения задаёт свой набор полей', () => {
  it('приход: куда, но не откуда', () => {
    const parsed = stockMovementCreateSchema.safeParse({
      kind: 'income',
      itemId: 's1',
      qty: '10',
      toZoneId: 'z1',
    });

    expect(parsed.success).toBe(true);
    expect(
      stockMovementCreateSchema.safeParse({ kind: 'income', itemId: 's1', qty: 1 }).success,
    ).toBe(false);
  });

  it('перемещение: обе зоны обязательны и должны различаться', () => {
    expect(
      stockMovementCreateSchema.safeParse({
        kind: 'transfer',
        itemId: 's1',
        qty: 1,
        fromZoneId: 'z1',
        toZoneId: 'z2',
      }).success,
    ).toBe(true);

    const same = stockMovementCreateSchema.safeParse({
      kind: 'transfer',
      itemId: 's1',
      qty: 1,
      fromZoneId: 'z1',
      toZoneId: 'z1',
    });

    expect(same.success).toBe(false);
    expect(!same.success && same.error.issues[0]?.path).toEqual(['toZoneId']);
  });

  it('списание: откуда и в какой наряд', () => {
    expect(
      stockMovementCreateSchema.safeParse({
        kind: 'consume',
        itemId: 's1',
        qty: 1,
        fromZoneId: 'z2',
        orderId: 'o1',
      }).success,
    ).toBe(true);

    expect(
      stockMovementCreateSchema.safeParse({
        kind: 'consume',
        itemId: 's1',
        qty: 1,
        fromZoneId: 'z2',
      }).success,
    ).toBe(false);
  });

  it('возврат: из наряда обратно в зону', () => {
    expect(
      stockMovementCreateSchema.safeParse({
        kind: 'return',
        itemId: 's1',
        qty: 1,
        orderId: 'o1',
        toZoneId: 'z2',
      }).success,
    ).toBe(true);
  });

  it('🔴 инвентаризация без основания не проводится', () => {
    const parsed = stockMovementCreateSchema.safeParse({
      kind: 'count',
      itemId: 's1',
      qty: -3,
      toZoneId: 'z1',
    });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.message).toBe(
      'Инвентаризация без основания не проводится',
    );
  });

  it('инвентаризация с основанием принимает поправку со знаком', () => {
    const parsed = stockMovementCreateSchema.safeParse({
      kind: 'count',
      itemId: 's1',
      qty: '-3,5',
      toZoneId: 'z1',
      reason: 'Пересчёт после ревизии',
    });

    expect(parsed.success && parsed.data.qty).toBe(-3.5);
  });

  it('шестого вида движения не бывает', () => {
    expect(
      stockMovementCreateSchema.safeParse({ kind: 'writeoff', itemId: 's1', qty: 1 }).success,
    ).toBe(false);
  });

  it('ни один вид не принимает из тела автора и ссылку на отмену', () => {
    const parsed = stockMovementCreateSchema.safeParse({
      kind: 'income',
      itemId: 's1',
      qty: 1,
      toZoneId: 'z1',
      authorId: 'u9',
      cancelsId: 'm1',
    });

    expect(parsed.success && 'authorId' in parsed.data).toBe(false);
    expect(parsed.success && 'cancelsId' in parsed.data).toBe(false);
  });
});

// ---------- Списание по наряду ----------

describe('списание по наряду', () => {
  const line = { itemId: 's1', qty: 1, fromZoneId: 'z2' };

  it('пустой список отвергается', () => {
    expect(orderConsumeSchema.safeParse({ lines: [] }).success).toBe(false);
  });

  it('🔴 длина списка ограничена: на каждую строку приходится несколько запросов', () => {
    expect(
      orderConsumeSchema.safeParse({ lines: Array.from({ length: 50 }, () => line) }).success,
    ).toBe(true);
    expect(
      orderConsumeSchema.safeParse({ lines: Array.from({ length: 51 }, () => line) }).success,
    ).toBe(false);
  });

  it('наряд телом не принимается: он приходит адресом маршрута', () => {
    const parsed = orderConsumeSchema.safeParse({ lines: [{ ...line, orderId: 'o1' }] });

    expect(parsed.success && 'orderId' in (parsed.data.lines[0] ?? {})).toBe(false);
  });
});

// ---------- Порог заказа ----------

/**
 * 🔴 Ошибка здесь стоит денег: по этим двум функциям считаются плитки склада
 * и список «пора заказывать», по которому владелец закупается (issue #606).
 */
describe('порог заказа', () => {
  it('ниже порога — это строго меньше порога', () => {
    expect(isLow(3, 6)).toBe(true);
    expect(isLow(6, 6)).toBe(false);
    expect(isLow(7, 6)).toBe(false);
  });

  it('🔴 ноль порога — за позицией не следим, а не «всё ниже порога»', () => {
    expect(isLow(0, 0)).toBe(false);
    expect(isNearLow(0, 0)).toBe(false);
  });

  it('подходит к порогу — запас не больше четверти сверх него', () => {
    expect(isNearLow(6, 6)).toBe(true);
    expect(isNearLow(6 * NEAR_LOW_RATIO, 6)).toBe(true);
    expect(isNearLow(6 * NEAR_LOW_RATIO + 0.1, 6)).toBe(false);
  });

  it('🔴 позиция не стоит в двух плитках сразу: иначе сумма не сходится', () => {
    expect(isLow(3, 6)).toBe(true);
    expect(isNearLow(3, 6)).toBe(false);
  });
});

// ---------- Знак у количества в журнале ----------

/**
 * 🔴 По журналу сверяют остаток (issue #610): приход и списание в колонке
 * «Сколько» выглядели одинаково, и разобрать, куда делись тридцать метров,
 * было нельзя.
 */
describe('знак движения', () => {
  it('приход и возврат добавляют', () => {
    expect(movementDelta('income', 50)).toBe(50);
    expect(movementDelta('return', 4)).toBe(4);
  });

  it('списание убавляет: направление задают зоны, а знак — вид движения', () => {
    expect(movementDelta('consume', 9)).toBe(-9);
  });

  it('инвентаризация приходит со своим знаком: она и добавляет, и убавляет', () => {
    expect(movementDelta('count', -1.2)).toBe(-1.2);
    expect(movementDelta('count', 2)).toBe(2);
  });

  it('🔴 у перемещения знака нет: общий остаток оно не меняет вовсе', () => {
    expect(movementDelta('transfer', 30)).toBeNull();
  });
});

// ---------- Период журнала ----------

describe('период журнала', () => {
  it('свои значения принимаются, чужие — нет', () => {
    expect(isStockPeriod('month')).toBe(true);
    expect(isStockPeriod('prev')).toBe(true);
    expect(isStockPeriod('year')).toBe(false);
  });
});
