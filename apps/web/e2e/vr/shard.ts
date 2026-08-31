/**
 * Доля историй одного шарда (issue #450, ADR-231).
 *
 * 🔴 Принадлежность истории шарду считается устойчивым хешем её id, а не
 * местом в списке. Кадры базы и ветки снимают разные прогоны раннера: базу —
 * запись в кеш, ветку — сравнение. Дели мы список по порядку, добавление или
 * удаление одной истории сдвинуло бы принадлежность всех последующих: истории
 * «переехали» бы между шардами, кадр базы оказался бы в кеше другого шарда, и
 * честные истории ложно стали бы «новыми» — без единого визуального
 * изменения. Хеш по id даёт истории один и тот же шард независимо от состава
 * списка.
 *
 * Модуль намеренно не импортирует Playwright: разбор и срез — чистые функции,
 * их проверяет vitest без браузера.
 */

export type Shard = {
  /** Номер доли, с единицы — как в `VR_SHARD=k/n`. */
  readonly index: number;
  /** Сколько долей всего. */
  readonly total: number;
};

const SHARD_FORM = /^([1-9]\d*)\/([1-9]\d*)$/;

/**
 * Доля этого прогона из `VR_SHARD` вида `k/n`; без переменной — `null`,
 * снимается весь список.
 *
 * 🔴 Кривое значение — громкая ошибка, а не молчаливый полный прогон.
 * Молчание прятало бы сломанную работу пайплайна за правдоподобным зелёным:
 * прогон «все истории в каждом шарде» проходит — просто в несколько раз
 * дольше и мимо шардового кеша.
 */
export function shardFromEnv(): Shard | null {
  const raw = process.env.VR_SHARD;
  if (raw === undefined || raw.length === 0) return null;
  return parseShard(raw);
}

export function parseShard(raw: string): Shard {
  const match = SHARD_FORM.exec(raw);
  if (match === null) {
    throw new Error(`VR_SHARD: ожидается «k/n» с номером доли k от 1 до n, получено «${raw}»`);
  }

  const index = Number(match[1]);
  const total = Number(match[2]);
  if (index > total) {
    throw new Error(`VR_SHARD: доли «${raw}» не существует — долей всего ${total}`);
  }

  return { index, total };
}

/**
 * FNV-1a, 32 бита, по кодовым единицам строки. Быстрый, детерминированный и
 * достаточно ровный для сотен id; криптостойкость здесь не нужна.
 */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Доля списка, принадлежащая шарду. Пустая доля законна. */
export function shardSlice<T extends { readonly id: string }>(
  items: readonly T[],
  shard: Shard,
): readonly T[] {
  return items.filter((item) => fnv1a(item.id) % shard.total === shard.index - 1);
}
