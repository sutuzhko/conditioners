// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { LEGAL_FORMS, legalSchema, settingSchemas } from '@/entities/settings/model';
import { checkReadiness } from '@/server/repo/settings';
import {
  PLACEHOLDER,
  PUBLIC_SETTING_KEYS,
  REQUIRED_FIELDS,
  SETTING_KEYS,
  isSettingKey,
  normalizePhone,
} from '@/server/repo/settings-schemas';

/**
 * Реквизиты предпринимателя с верными контрольными разрядами: схема проверяет
 * арифметику, а не длину строки (PROJECT §5.2), и правдоподобный набор цифр
 * она бы отвергла.
 */
const entrepreneur = {
  form: 'ИП',
  name: 'Ковалёв Сергей Николаевич',
  inn: '710703123450',
  ogrn: '314710700012346',
  regDate: '2015-03-12',
  regAuthority: 'Межрайонная ИФНС России № 10 по Тульской области',
  address: '300026, Тульская область, г. Тула, ул. Рязанская, д. 24, кв. 71',
};

const company = {
  form: 'ООО',
  name: 'Общество с ограниченной ответственностью «Пример»',
  shortName: 'ООО «Пример»',
  inn: '7107023451',
  kpp: '710701001',
  ogrn: '1027107001239',
  address: '300041, Тульская область, г. Тула, проспект Ленина, д. 108',
};

/** Что не заполнено в группе реквизитов по мнению проверки готовности. */
function legalIssues(legal: unknown): readonly string[] {
  const report = checkReadiness({ legal });
  const group = report.groups.find((item) => item.key === 'legal');

  return (group?.issues ?? []).map((issue) => issue.field);
}

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

/**
 * 🔴 Состав обязательного задаёт форма регистрации (ADR-112, PROJECT §5.1).
 * Один список на обе формы требовал бы от предпринимателя места нахождения
 * общества, а от общества — органа регистрации, которого у него не бывает.
 */
describe('готовность реквизитов считается по форме регистрации', () => {
  it('у предпринимателя дата и орган регистрации обязательны', () => {
    expect(legalIssues({ ...entrepreneur, regDate: '', regAuthority: '' })).toEqual([
      'regDate',
      'regAuthority',
    ]);
  });

  it('у предпринимателя не требуются КПП, банк и адрес регистрации', () => {
    // адрес предпринимателя — как правило домашний, на сайт он не выводится
    expect(legalIssues({ ...entrepreneur, address: '' })).toEqual([]);
    expect(REQUIRED_FIELDS.legal['ИП']).not.toContain('kpp');
    expect(REQUIRED_FIELDS.legal['ИП']).not.toContain('bankAccount');
  });

  it('у общества обязательны сокращённое наименование и место нахождения', () => {
    expect(legalIssues({ ...company, shortName: '', address: '' })).toEqual([
      'shortName',
      'address',
    ]);
  });

  it('у общества органа регистрации в списке нет вовсе', () => {
    expect(REQUIRED_FIELDS.legal['ООО']).not.toContain('regAuthority');
    expect(REQUIRED_FIELDS.legal['ООО']).not.toContain('regDate');
    // КПП есть у общества, но счетам, а не витрине — обязательным не считается
    expect(legalIssues({ ...company, kpp: '' })).toEqual([]);
  });

  it('группа без формы считается по набору предпринимателя', () => {
    const { form, ...withoutForm } = entrepreneur;
    // фикстура заведомо предпринимательская — иначе проверка ничего не значит
    expect(form).toBe('ИП');

    /* Так же группу разбирает схема (`withDefaultForm`): спрошен орган
       регистрации, которого у общества не бывает, а сокращённого
       наименования в отчёте нет. Сама незаполненная форма — тоже пробел:
       владелец обязан выбрать её явно. */
    expect(legalIssues({ ...withoutForm, regAuthority: '' })).toEqual(['form', 'regAuthority']);
  });

  /**
   * 🔴 Группа, которую не принимает её собственная схема, не может считаться
   * готовой. Публичная страница разбирает её той же схемой и при отказе
   * берёт умолчания — реквизиты исчезают из футера целиком, а не одним
   * полем. Панель, отвечающая «заполнено», отправила бы владельца
   * публиковать сайт с пустыми реквизитами.
   *
   * Завести такую запись через админку больше нельзя: маршрут настроек
   * валидирует тело той же схемой. Она бывает только сохранённой до того,
   * как поле стало проверяться.
   */
  it('битый реквизит виден в отчёте, хотя поле заполнено', () => {
    const typo = { ...entrepreneur, inn: '710512345678' };

    expect(legalIssues(typo)).toEqual(['inn']);

    const group = checkReadiness({ legal: typo }).groups.find((item) => item.key === 'legal');
    expect(group?.ready).toBe(false);
    expect(group?.issues).toContainEqual({ field: 'inn', reason: 'invalid' });
  });

  it('верные реквизиты отчёт не тревожат', () => {
    expect(legalIssues(entrepreneur)).toEqual([]);
    expect(legalIssues(company)).toEqual([]);
  });

  it('заглушка в реквизитах находится по-прежнему', () => {
    expect(legalIssues({ ...entrepreneur, inn: PLACEHOLDER })).toEqual(['inn']);
    const report = checkReadiness({ legal: { ...entrepreneur, inn: PLACEHOLDER } });
    const group = report.groups.find((item) => item.key === 'legal');

    expect(group?.issues).toContainEqual({ field: 'inn', reason: 'placeholder' });
  });

  /**
   * Опечатка в имени обязательного поля не видна глазом: поле, которого в
   * группе нет, навсегда осталось бы «незаполненным», и владелец не смог бы
   * довести настройки до готовности никаким заполнением.
   */
  it.each(LEGAL_FORMS)('обязательные поля формы %s существуют в схеме', (form) => {
    const parsed = legalSchema.parse({ form });

    expect(Object.keys(parsed)).toEqual(expect.arrayContaining([...REQUIRED_FIELDS.legal[form]]));
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
      legal: entrepreneur,
      extras: { trassaPerM: 700, shtrobPerM: 800, heightWorks: 2000 },
      warranty: { installation: 'год', equipment: 'три года' },
      // рабочее окно календаря: умолчание есть, но группа обязана быть сохранена
      schedule: { fromMin: 540, toMin: 1140 },
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
