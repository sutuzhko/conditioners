// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkReadiness } from '@/server/repo/settings';
import {
  PLACEHOLDER,
  PUBLIC_SETTING_KEYS,
  SETTING_KEYS,
  isSettingKey,
  normalizePhone,
  settingsSchemas,
} from '@/server/repo/settings-schemas';

describe('телефон приводится к единому виду', () => {
  it.each([
    ['8 (4872) 12-34-56', '+7 (487) 212-34-56'],
    ['+7 953 123-45-67', '+7 (953) 123-45-67'],
    ['9531234567', '+7 (953) 123-45-67'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('заглушку не трогает — иначе она перестанет быть заметной', () => {
    expect(normalizePhone(PLACEHOLDER)).toBe(PLACEHOLDER);
  });
});

describe('схемы групп настроек', () => {
  it('координаты вне диапазона не сохраняются', () => {
    expect(settingsSchemas.geo.safeParse({ lat: 54.19, lng: 37.61 }).success).toBe(true);
    expect(settingsSchemas.geo.safeParse({ lat: 154, lng: 37.61 }).success).toBe(false);
  });

  it('форма собственности — только ИП или ООО', () => {
    const legal = { name: 'x', inn: '1', ogrn: '2', address: 'y' };

    expect(settingsSchemas.legal.safeParse({ ...legal, form: 'ИП' }).success).toBe(true);
    expect(settingsSchemas.legal.safeParse({ ...legal, form: 'АО' }).success).toBe(false);
  });

  it('часы работы для разметки проверяются на формат', () => {
    const contacts = {
      phones: [],
      email: '',
      telegram: '',
      whatsapp: '',
      hours: 'Пн–Вс, 8:00–21:00',
    };

    expect(
      settingsSchemas.contacts.safeParse({
        ...contacts,
        openingHours: [{ days: ['Mo'], opens: '08:00', closes: '21:00' }],
      }).success,
    ).toBe(true);

    expect(
      settingsSchemas.contacts.safeParse({
        ...contacts,
        openingHours: [{ days: ['Mo'], opens: 'утром', closes: '21:00' }],
      }).success,
    ).toBe(false);
  });

  it('лишние поля в группу не пролезают', () => {
    expect(settingsSchemas.geo.safeParse({ lat: 1, lng: 2, secret: 'x' }).success).toBe(false);
  });

  it('настройки интеграций публично не отдаются', () => {
    expect(isSettingKey('integrations')).toBe(true);
    expect(PUBLIC_SETTING_KEYS).not.toContain('integrations');
    expect(SETTING_KEYS.length).toBeGreaterThan(PUBLIC_SETTING_KEYS.length);
  });
});

describe('готовность данных компании', () => {
  it('заглушка из сидов считается незаполненным полем', () => {
    const report = checkReadiness({
      company: { name: PLACEHOLDER, legalName: 'ООО «Тест»', tagline: 'x', foundedYear: null },
    });
    const company = report.groups.find((group) => group.key === 'company');

    expect(report.ready).toBe(false);
    expect(company?.issues).toContainEqual({ field: 'name', reason: 'placeholder' });
  });

  it('находит заглушку внутри массива', () => {
    const report = checkReadiness({ contacts: { phones: [PLACEHOLDER], email: '', hours: '' } });
    const contacts = report.groups.find((group) => group.key === 'contacts');

    expect(contacts?.issues).toContainEqual({ field: 'phones[0]', reason: 'placeholder' });
  });

  it('пустое обязательное поле видно отдельно от заглушки', () => {
    const report = checkReadiness({ geo: { lat: null, lng: null } });
    const geo = report.groups.find((group) => group.key === 'geo');

    expect(geo?.issues).toEqual([
      { field: 'lat', reason: 'empty' },
      { field: 'lng', reason: 'empty' },
    ]);
  });

  it('несохранённая группа отмечается как отсутствующая', () => {
    const report = checkReadiness({});

    expect(report.groups.every((group) => group.issues[0]?.reason === 'missing')).toBe(true);
  });

  it('заполненные данные проходят проверку', () => {
    const report = checkReadiness({
      company: { name: 'Компания', legalName: 'ООО «Компания»', tagline: 'Слоган' },
      contacts: { phones: ['+7 (953) 123-45-67'], email: 'a@b.ru', hours: 'Пн–Вс, 8:00–21:00' },
      address: {
        country: 'RU',
        region: 'Область',
        city: 'Город',
        street: 'Улица',
        building: '1',
        postalCode: '300000',
      },
      geo: { lat: 54.19, lng: 37.61 },
      area: { served: 'Город и область' },
      legal: { form: 'ИП', name: 'ИП Иванов', inn: '1', ogrn: '2', address: 'Адрес' },
      extras: { trassaPerM: 700, shtrobPerM: 800, heightWorks: 2000 },
      warranty: { installation: 'год', equipment: 'три года' },
      payment: { methods: ['карта'], vat: 'без НДС' },
      social: { links: [] },
      seo: { homeTitle: 'Заголовок', homeDescription: 'Описание', titleSuffix: 'Бренд' },
      integrations: { metrikaId: '', messengerButtons: { telegram: false, whatsapp: false } },
    });

    expect(report.ready).toBe(true);
  });
});
