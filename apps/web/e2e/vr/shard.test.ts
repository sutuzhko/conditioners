import { describe, expect, it } from 'vitest';

import { parseShard, shardSlice } from './shard';

/** Синтетические id в духе индекса витрины — кириллица и `--` внутри. */
function ids(count: number, prefix = 'блоки-история'): { readonly id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}--вариант-${i}` }));
}

/** Карта «id → номер доли», построенная только через публичный срез. */
function membership(list: readonly { readonly id: string }[], total: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let index = 1; index <= total; index += 1) {
    for (const item of shardSlice(list, { index, total })) map.set(item.id, index);
  }
  return map;
}

describe('parseShard', () => {
  it('разбирает «k/n»', () => {
    expect(parseShard('2/4')).toEqual({ index: 2, total: 4 });
    expect(parseShard('1/1')).toEqual({ index: 1, total: 1 });
  });

  it('🔴 мусор — громкая ошибка, а не молчаливый полный прогон', () => {
    for (const raw of ['0/4', '5/4', 'abc', '2', '2/0', '-1/4', '1.5/4', '/4', '4/', '01/4']) {
      expect(() => parseShard(raw), raw).toThrowError(/VR_SHARD/);
    }
  });
});

describe('shardSlice', () => {
  it('доли не пересекаются и вместе дают весь список', () => {
    const list = ids(500);
    const seen = membership(list, 4);
    expect(seen.size).toBe(list.length);
  });

  it('🔴 история не переезжает между шардами при изменении состава списка', () => {
    /* Свойство, ради которого доля считается хешем id: кадры базы снимает
       один прогон, кадры ветки — другой, и списки историй у них разные.
       Проверяется через публичный срез, а не через хеш: важно поведение. */
    const total = 4;
    const before = membership(ids(300), total);

    const reduced = [...ids(300).filter((_, i) => i % 2 === 0), ...ids(60, 'новый-раздел')];
    const after = membership(reduced, total);

    for (const [id, shard] of after) {
      const was = before.get(id);
      if (was !== undefined) expect(shard, id).toBe(was);
    }
  });

  it('распределение примерно ровное: на 500 историях нет пустых и перекошенных долей', () => {
    const list = ids(500);
    for (let index = 1; index <= 4; index += 1) {
      const share = shardSlice(list, { index, total: 4 }).length;
      // без жёстких границ: ожидаемые 125, допуск в разы — ловим только вырождение
      expect(share).toBeGreaterThan(40);
      expect(share).toBeLessThan(250);
    }
  });

  it('пустая доля законна', () => {
    expect(shardSlice([], { index: 1, total: 4 })).toEqual([]);
  });
});
