import { describe, expect, it } from 'vitest';

import {
  contactsSchema,
  geoSchema,
  legalSchema,
  phoneSettingSchema,
  settingKeySchema,
  settingSchemas,
} from './model';

describe('settingSchemas', () => {
  it('покрывают все ключи из PROJECT §3', () => {
    expect(Object.keys(settingSchemas).sort()).toEqual([...settingKeySchema.options].sort());
  });

  it('ставки калькулятора приходят из группы extras', () => {
    expect(
      settingSchemas.extras.parse({ trassaPerM: 700, shtrobPerM: 800, heightWorks: 2000 }),
    ).toEqual({
      trassaPerM: 700,
      shtrobPerM: 800,
      heightWorks: 2000,
      trassaIncludedM: 3,
      heightFloorFrom: 10,
    });
  });
});

describe('phoneSettingSchema', () => {
  it('приводит номер к единому виду — расхождение NAP бьёт по локальной выдаче', () => {
    expect(phoneSettingSchema.parse('8 (900) 123-45-67')).toBe('+79001234567');
    expect(phoneSettingSchema.parse('+7 4872 123456')).toBe('+74872123456');
    expect(phoneSettingSchema.parse('9001234567')).toBe('+79001234567');
  });
});

describe('contactsSchema', () => {
  it('неполные данные сохранить можно — владелец заполняет постепенно', () => {
    expect(contactsSchema.parse({})).toEqual({
      phones: [],
      email: '',
      telegram: '',
      whatsapp: '',
      hours: '',
      openingHours: [],
    });
  });
});

describe('geoSchema', () => {
  it('проверяет диапазон координат', () => {
    expect(geoSchema.parse({ lat: 54.19, lng: 37.61 })).toEqual({ lat: 54.19, lng: 37.61 });
    expect(geoSchema.parse({}).lat).toBeNull();
    expect(() => geoSchema.parse({ lat: 100, lng: 0 })).toThrow();
    expect(() => geoSchema.parse({ lat: 0, lng: 200 })).toThrow();
  });
});

describe('legalSchema', () => {
  it('форма собственности — только ИП или ООО', () => {
    expect(legalSchema.parse({ form: 'ООО' }).form).toBe('ООО');
    expect(() => legalSchema.parse({ form: 'ЗАО' })).toThrow();
  });
});
