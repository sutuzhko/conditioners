import { describe, expect, it } from 'vitest';

import { toRequestBody } from './lib';

describe('тело запроса справочника', () => {
  it('обрезает пробелы и сохраняет порядок', () => {
    expect(
      toRequestBody({
        groups: [
          {
            title: '  Основное ',
            fields: [{ k: ' Мощность ', unit: ' кВт ', hint: ' о мощности ' }],
          },
        ],
      }),
    ).toEqual({
      groups: [{ title: 'Основное', fields: [{ k: 'Мощность', unit: 'кВт', hint: 'о мощности' }] }],
    });
  });

  it('поле без названия — забытая строка, а не характеристика', () => {
    expect(
      toRequestBody({
        groups: [
          {
            title: 'Основное',
            fields: [
              { k: 'Мощность', unit: '', hint: '' },
              { k: '  ', unit: 'кВт', hint: '' },
            ],
          },
        ],
      }),
    ).toEqual({ groups: [{ title: 'Основное', fields: [{ k: 'Мощность', unit: '', hint: '' }] }] });
  });

  it('группа без названия или без полей отбрасывается целиком', () => {
    expect(
      toRequestBody({
        groups: [
          { title: '', fields: [{ k: 'Мощность', unit: '', hint: '' }] },
          { title: 'Пустая', fields: [] },
        ],
      }),
    ).toEqual({ groups: [] });
  });
});
