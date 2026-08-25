import { describe, expect, it } from 'vitest';

import {
  EMPTY_SPEC_DICTIONARY,
  OTHER_SPECS_TITLE,
  groupSpecs,
  orderSpecKeys,
  specGroupTitle,
  type SpecDictionary,
} from './groupSpecs';

const spec = (k: string, v: string, sort = 0) => ({ k, v, sort });

const dictionary: SpecDictionary = {
  groups: [
    { title: 'Основное', fields: [{ k: 'Мощность охлаждения' }, { k: 'Тип компрессора' }] },
    { title: 'Шум и воздух', fields: [{ k: 'Уровень шума внутреннего блока' }] },
  ],
};

describe('группировка характеристик', () => {
  it('раскладывает по группам справочника и в его порядке', () => {
    const groups = groupSpecs(
      [
        spec('Тип компрессора', 'инверторный', 0),
        spec('Уровень шума внутреннего блока', '21 дБ', 1),
        spec('Мощность охлаждения', '2.6 кВт', 2),
      ],
      dictionary,
    );

    expect(groups).toEqual([
      {
        title: 'Основное',
        items: [
          { k: 'Мощность охлаждения', v: '2.6 кВт' },
          { k: 'Тип компрессора', v: 'инверторный' },
        ],
      },
      { title: 'Шум и воздух', items: [{ k: 'Уровень шума внутреннего блока', v: '21 дБ' }] },
    ]);
  });

  it('🔴 характеристика вне справочника не теряется, а уходит в «Прочее» (инвариант 6)', () => {
    const groups = groupSpecs(
      [spec('Мощность охлаждения', '2.6 кВт'), spec('Цвет корпуса', 'белый', 1)],
      dictionary,
    );

    expect(groups.at(-1)).toEqual({
      title: OTHER_SPECS_TITLE,
      items: [{ k: 'Цвет корпуса', v: 'белый' }],
    });
  });

  it('«Прочее» идёт последним, а его строки — в порядке владельца', () => {
    const groups = groupSpecs(
      [
        spec('Гарантия', '3 года', 0),
        spec('Цвет', 'белый', 1),
        spec('Тип компрессора', 'on/off', 2),
      ],
      dictionary,
    );

    expect(groups.map((group) => group.title)).toEqual(['Основное', OTHER_SPECS_TITLE]);
    expect(groups[1]?.items.map((item) => item.k)).toEqual(['Гарантия', 'Цвет']);
  });

  it('пустых групп не возвращает: заголовок без строк — шум', () => {
    const groups = groupSpecs([spec('Мощность охлаждения', '2.6 кВт')], dictionary);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe('Основное');
  });

  it('без справочника всё остаётся одним списком в порядке владельца', () => {
    const groups = groupSpecs([spec('Б', '2', 1), spec('А', '1', 0)], EMPTY_SPEC_DICTIONARY);

    expect(groups).toEqual([
      {
        title: OTHER_SPECS_TITLE,
        items: [
          { k: 'А', v: '1' },
          { k: 'Б', v: '2' },
        ],
      },
    ]);
  });

  it('модель без характеристик даёт пустой список групп', () => {
    expect(groupSpecs([], dictionary)).toEqual([]);
  });

  it('повторённое в справочнике название остаётся за первым вхождением', () => {
    const doubled: SpecDictionary = {
      groups: [
        { title: 'Первая', fields: [{ k: 'Шум' }] },
        { title: 'Вторая', fields: [{ k: 'Шум' }] },
      ],
    };

    expect(groupSpecs([spec('Шум', '21 дБ')], doubled)).toEqual([
      { title: 'Первая', items: [{ k: 'Шум', v: '21 дБ' }] },
    ]);
  });
});

describe('порядок названий по справочнику', () => {
  it('известные идут в порядке справочника, остальные — следом', () => {
    expect(
      orderSpecKeys(
        ['Цвет', 'Уровень шума внутреннего блока', 'Гарантия', 'Мощность охлаждения'],
        dictionary,
      ),
    ).toEqual(['Мощность охлаждения', 'Уровень шума внутреннего блока', 'Цвет', 'Гарантия']);
  });

  it('без справочника порядок не меняется', () => {
    expect(orderSpecKeys(['Б', 'А'], EMPTY_SPEC_DICTIONARY)).toEqual(['Б', 'А']);
  });
});

describe('группа характеристики', () => {
  it('известная характеристика знает свою группу', () => {
    expect(specGroupTitle('Тип компрессора', dictionary)).toBe('Основное');
  });

  it('неизвестная группы не имеет', () => {
    expect(specGroupTitle('Цвет', dictionary)).toBeNull();
  });
});
