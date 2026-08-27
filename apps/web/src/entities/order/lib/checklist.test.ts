import { describe, expect, it } from 'vitest';

import {
  buildChecklist,
  planChecklist,
  type ChecklistSource,
  type ChecklistUnit,
} from './checklist';

const unit: ChecklistUnit = {
  equip: 'conditioner',
  model: 'Сплит-система 09',
  source: 'ours',
  trassaM: 4,
  diameter: '1/4–3/8',
  shtrob: false,
};

const order: ChecklistSource = {
  type: 'install',
  heightWorks: false,
  payment: 'company',
  price: 38_500,
  units: [unit],
};

describe('сборка чеклиста выезда', () => {
  it('тип работ даёт инструмент: монтаж и обслуживание везут разное', () => {
    const install = buildChecklist(order);
    const service = buildChecklist({ ...order, type: 'service' });

    expect(install).toContain('Перфоратор с бурами и удлинителем');
    expect(service).not.toContain('Перфоратор с бурами и удлинителем');
    expect(service).toContain('Мойка высокого давления и пакет для чистки');
  });

  it('каждая позиция даёт свою трассу и диаметр', () => {
    const lines = buildChecklist({
      ...order,
      units: [
        unit,
        { ...unit, model: 'Блок клиента', source: 'client', trassaM: 6, diameter: '1/4–1/2' },
      ],
    });

    expect(lines).toContain('Позиция 1, Сплит-система 09: медная трасса 4 м, диаметр 1/4–3/8');
    expect(lines).toContain('Позиция 2, Блок клиента: медная трасса 6 м, диаметр 1/4–1/2');
  });

  it('наше оборудование забирают со склада, блок клиента — нет', () => {
    const lines = buildChecklist({
      ...order,
      units: [unit, { ...unit, model: 'Блок клиента', source: 'client' }],
    });

    expect(lines).toContain('Забрать со склада — Позиция 1, Сплит-система 09');
    expect(lines).not.toContain('Забрать со склада — Позиция 2, Блок клиента');
  });

  it('позиция без размеров не пропадает, а просит уточнить их на объекте', () => {
    const lines = buildChecklist({
      ...order,
      units: [{ ...unit, model: null, trassaM: null, diameter: null }],
    });

    expect(lines).toContain('Позиция 1: уточнить трассу и диаметр на объекте');
  });

  it('штробление добавляет штроборез — один раз на весь наряд', () => {
    const lines = buildChecklist({
      ...order,
      units: [
        { ...unit, shtrob: true },
        { ...unit, model: 'Второй блок', shtrob: true },
      ],
    });

    expect(lines.filter((line) => line.startsWith('Штроборез'))).toHaveLength(1);
  });

  it('без штробления штробореза в списке нет', () => {
    expect(buildChecklist(order).some((line) => line.startsWith('Штроборез'))).toBe(false);
  });

  it('высотные работы добавляют страховку', () => {
    expect(buildChecklist({ ...order, heightWorks: true })).toContain(
      'Страховочная система и каска: работы на высоте',
    );
  });

  it('🔴 оплата наличными добавляет сумму, которую примут от клиента', () => {
    const lines = buildChecklist({ ...order, payment: 'cash_to_installer' });

    expect(lines.some((line) => line.startsWith('Принять от клиента'))).toBe(true);
    expect(lines.some((line) => line.includes('38'))).toBe(true);
  });

  it('🔴 платит компания — строки про наличные нет: этих денег монтажник не берёт', () => {
    expect(buildChecklist(order).some((line) => line.startsWith('Принять от клиента'))).toBe(false);
  });

  it('нулевая сумма наличными строки не даёт: принимать нечего', () => {
    const lines = buildChecklist({ ...order, payment: 'cash_to_installer', price: 0 });

    expect(lines.some((line) => line.startsWith('Принять от клиента'))).toBe(false);
  });

  it('наряд без позиций всё равно даёт инструмент: ехать на объект уже решено', () => {
    expect(buildChecklist({ ...order, units: [] }).length).toBeGreaterThan(0);
  });

  it('повторов в списке нет: чеклист сверяют по тексту', () => {
    const lines = buildChecklist({ ...order, units: [unit, unit] });

    expect(new Set(lines).size).toBe(lines.length);
  });
});

describe('пересборка чеклиста', () => {
  it('🔴 сохраняет дописанное человеком: свой пункт уходит в конец, но остаётся', () => {
    const plan = planChecklist(['Стремянка'], [{ id: 'own1', text: 'Взять чехлы', own: true }]);

    expect(plan.remove).toEqual([]);
    expect(plan.keep).toContainEqual({ id: 'own1', sort: 1 });
    expect(plan.create).toEqual([{ text: 'Стремянка', sort: 0 }]);
  });

  it('🔴 сохраняет отметку при сборах: пункт с тем же текстом не заводится заново', () => {
    const plan = planChecklist(
      ['Стремянка', 'Перфоратор'],
      [{ id: 'b1', text: 'Стремянка', own: false }],
    );

    expect(plan.keep).toEqual([{ id: 'b1', sort: 0 }]);
    expect(plan.create).toEqual([{ text: 'Перфоратор', sort: 1 }]);
    expect(plan.remove).toEqual([]);
  });

  it('исчезнувший из наряда пункт удаляется: позицию сняли — трасса больше не нужна', () => {
    const plan = planChecklist(
      ['Стремянка'],
      [
        { id: 'b1', text: 'Стремянка', own: false },
        { id: 'b2', text: 'Позиция 2: медная трасса 6 м', own: false },
      ],
    );

    expect(plan.remove).toEqual(['b2']);
  });

  it('порядок собранных пунктов задаёт наряд, а не история правок', () => {
    const plan = planChecklist(
      ['Первый', 'Второй'],
      [
        { id: 'b2', text: 'Второй', own: false },
        { id: 'b1', text: 'Первый', own: false },
      ],
    );

    expect(plan.keep).toEqual([
      { id: 'b1', sort: 0 },
      { id: 'b2', sort: 1 },
    ]);
  });

  it('свои пункты сохраняют порядок между собой', () => {
    const plan = planChecklist(
      ['Собранный'],
      [
        { id: 'own1', text: 'Первый свой', own: true },
        { id: 'own2', text: 'Второй свой', own: true },
      ],
    );

    expect(plan.keep).toEqual([
      { id: 'own1', sort: 1 },
      { id: 'own2', sort: 2 },
    ]);
  });

  it('пустой наряд оставляет только дописанное', () => {
    const plan = planChecklist([], [{ id: 'own1', text: 'Взять чехлы', own: true }]);

    expect(plan.keep).toEqual([{ id: 'own1', sort: 0 }]);
    expect(plan.remove).toEqual([]);
  });
});
