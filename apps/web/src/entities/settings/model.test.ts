import { describe, expect, it } from 'vitest';

import { SETTING_PLACEHOLDER } from './lib/readiness';
import {
  companySchema,
  contactsSchema,
  geoSchema,
  legalSchema,
  phoneSettingSchema,
  settingKeySchema,
  settingSchemas,
  socialSchema,
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

  /**
   * 🔴 Схема группы `extras` — та же, что валидирует админ-API. Пока их было
   * две, включённые метры трассы и порог высотных работ (ADR-029) сохранялись,
   * но обратно не читались: серверная копия про эти поля не знала и отвергала
   * группу целиком. Калькулятор в этот момент показывал не ту цену, которую
   * задал владелец, — это красная линия «не врать в цене», а не расхождение схем.
   */
  it('заданные владельцем метры трассы и этаж не теряются', () => {
    const saved = {
      trassaPerM: 700,
      shtrobPerM: 800,
      heightWorks: 2000,
      trassaIncludedM: 5,
      heightFloorFrom: 6,
    };

    expect(settingSchemas.extras.parse(saved)).toEqual(saved);
  });

  it('ставки из формы приходят строками и приводятся к числам', () => {
    expect(
      settingSchemas.extras.parse({
        trassaPerM: '700',
        shtrobPerM: '800',
        heightWorks: '2000',
        trassaIncludedM: '5',
        heightFloorFrom: '6',
      }),
    ).toEqual({
      trassaPerM: 700,
      shtrobPerM: 800,
      heightWorks: 2000,
      trassaIncludedM: 5,
      heightFloorFrom: 6,
    });
  });

  it('лишнее поле в группу не пролезает: это опечатка в имени, а не расширение', () => {
    expect(settingSchemas.geo.safeParse({ lat: 1, lng: 2, secret: 'x' }).success).toBe(false);
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
  const contacts = { phones: [], email: '', telegram: '', whatsapp: '', hours: 'Пн–Вс' };

  it('часы работы для разметки проверяются на формат', () => {
    expect(
      contactsSchema.safeParse({ ...contacts, openingHours: ['Mo-Su 08:00-21:00'] }).success,
    ).toBe(true);

    // невалидную строку поисковик выбросит молча, и разметка разойдётся
    // с видимым текстом страницы (инвариант 9)
    expect(contactsSchema.safeParse({ ...contacts, openingHours: ['утром'] }).success).toBe(false);
    expect(
      contactsSchema.safeParse({ ...contacts, openingHours: ['Mo-Su 8:00-21:00'] }).success,
    ).toBe(false);
  });

  it('мусор вместо почты не сохраняется, а заглушка сидов проходит', () => {
    expect(contactsSchema.safeParse({ ...contacts, email: 'почта' }).success).toBe(false);
    expect(contactsSchema.parse({ ...contacts, email: SETTING_PLACEHOLDER }).email).toBe(
      SETTING_PLACEHOLDER,
    );
    expect(contactsSchema.parse({ ...contacts, email: 'info@example.ru' }).email).toBe(
      'info@example.ru',
    );
  });

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

describe('companySchema', () => {
  it('год основания из формы приходит строкой', () => {
    expect(companySchema.parse({ foundedYear: '2014' }).foundedYear).toBe(2014);
    expect(companySchema.parse({}).foundedYear).toBeNull();
  });
});

describe('socialSchema', () => {
  it('битая ссылка не сохраняется: в футере она хуже отсутствия', () => {
    expect(socialSchema.safeParse({ links: ['вконтакте'] }).success).toBe(false);
    expect(socialSchema.parse({ links: ['https://vk.com/example'] }).links).toEqual([
      'https://vk.com/example',
    ]);
  });
});

describe('geoSchema', () => {
  it('координаты из формы приходят строками', () => {
    expect(geoSchema.parse({ lat: '54.19', lng: '37.61' })).toEqual({ lat: 54.19, lng: 37.61 });
  });

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

  it('объясняет ошибку по-русски: сообщение видит владелец', () => {
    const parsed = legalSchema.safeParse({ form: 'АО' });

    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0]?.message).toBe(
      'Форма — ИП или ООО',
    );
  });
});
