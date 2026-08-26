// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { settingSchemas } from '@/entities/settings/model';
import { checkReadiness } from '@/server/repo/settings';
import {
  PLACEHOLDER,
  PUBLIC_SETTING_KEYS,
  SETTING_KEYS,
  isSettingKey,
  normalizePhone,
} from '@/server/repo/settings-schemas';

/**
 * Номер хранится машинным `+7XXXXXXXXXX`, а человеку его показывает
 * `formatPhone`: она знает про четырёхзначный код Тулы и не режет городской
 * номер на «+7 (487) 2…», как это делала прежняя серверная копия.
 */
describe('телефон приводится к единому виду', () => {
  it.each([
    ['8 (4872) 12-34-56', '+74872123456'],
    ['+7 953 123-45-67', '+79531234567'],
    ['9531234567', '+79531234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('заглушку не трогает — иначе она перестанет быть заметной', () => {
    expect(normalizePhone(PLACEHOLDER)).toBe(PLACEHOLDER);
  });
});

describe('реестр ключей', () => {
  it('настройки интеграций публично не отдаются', () => {
    expect(isSettingKey('integrations')).toBe(true);
    expect(PUBLIC_SETTING_KEYS).not.toContain('integrations');
    expect(SETTING_KEYS.length).toBeGreaterThan(PUBLIC_SETTING_KEYS.length);
  });

  it('ключи реестра совпадают с группами доменной схемы', () => {
    expect([...SETTING_KEYS].sort()).toEqual(Object.keys(settingSchemas).sort());
  });

  it('выдуманного раздела настроек не существует', () => {
    expect(isSettingKey('выдумка')).toBe(false);
  });
});

describe('готовность данных компании', () => {
  it('заглушка из сидов считается незаполненным полем', () => {
    const report = checkReadiness({
      company: { name: PLACEHOLDER, tagline: 'x', foundedYear: null },
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
      company: { name: 'Компания', tagline: 'Слоган' },
      contacts: { phones: ['+79531234567'], email: 'a@b.ru', hours: 'Пн–Вс, 8:00–21:00' },
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
      // цифры полосы первого экрана необязательны: пустой список — норма
      achievements: { items: [] },
      // справочник характеристик необязателен: без него они идут одним списком
      specs: { groups: [] },
      // каналы уведомлений: выключить оба — осознанный выбор владельца
      notifications: { telegram: true, email: true },
      integrations: { metrikaId: '', messengerButtons: { telegram: false, whatsapp: false } },
    });

    expect(report.ready).toBe(true);
  });
});
