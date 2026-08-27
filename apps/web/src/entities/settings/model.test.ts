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

/**
 * Номера с верными контрольными разрядами. Придуманные, но арифметически
 * настоящие: тест на «7100000000» проверял бы длину строки, а не проверку.
 */
const INN_IP = '710703123450';
const INN_OOO = '7107023451';
const OGRNIP = '314710700012346';
const OGRN = '1027107001239';
const KPP = '710701001';
const BIK = '047003608';
const ACCOUNT = '40702810700000000001';
const CORR_ACCOUNT = '30101810700000000004';

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
      responseTime: '',
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
  it('форма регистрации — только ИП или ООО', () => {
    expect(legalSchema.parse({ form: 'ООО' }).form).toBe('ООО');
    expect(() => legalSchema.parse({ form: 'ЗАО' })).toThrow();
  });

  it('объясняет ошибку по-русски: сообщение видит владелец', () => {
    const parsed = legalSchema.safeParse({ form: 'АО' });

    expect(parsed.success).toBe(false);
    expect(parsed.success === false && parsed.error.issues[0]?.message).toBe(
      'Форма регистрации — ИП или ООО',
    );
  });

  /**
   * 🔴 Группа без формы осталась в базе с тех пор, когда вариантов не было.
   * Публичная страница обязана открыться на ней, а не упасть: реквизиты стоят
   * в футере каждой страницы сайта.
   */
  it('старая запись без формы разбирается как ИП', () => {
    expect(legalSchema.parse({ inn: INN_IP }).form).toBe('ИП');
  });

  it('поле чужой формы не сохраняется, а отвергается', () => {
    expect(() => legalSchema.parse({ form: 'ИП', kpp: KPP })).toThrow();
    expect(() => legalSchema.parse({ form: 'ООО', regAuthority: 'ИФНС' })).toThrow();
  });

  /**
   * 🔴 Проверяется арифметика, а не длина строки (PROJECT §5.2): ИНН из
   * двенадцати цифр с битым контрольным разрядом — самая частая описка, и
   * длиной её не поймать.
   */
  it('ИНН предпринимателя проверяется контрольным разрядом', () => {
    expect(legalSchema.parse({ form: 'ИП', inn: INN_IP }).inn).toBe(INN_IP);
    expect(legalSchema.safeParse({ form: 'ИП', inn: '710703123451' }).success).toBe(false);
    // десять цифр — не описка, а признак того, что выбрана не та форма
    expect(legalSchema.safeParse({ form: 'ИП', inn: INN_OOO }).success).toBe(false);
  });

  it('ИНН, ОГРН и КПП организации проверяются контрольным разрядом', () => {
    const parsed = legalSchema.parse({ form: 'ООО', inn: INN_OOO, ogrn: OGRN, kpp: KPP });

    expect(parsed).toMatchObject({ inn: INN_OOO, ogrn: OGRN, kpp: KPP });
    expect(legalSchema.safeParse({ form: 'ООО', ogrn: '1027107001238' }).success).toBe(false);
    expect(legalSchema.safeParse({ form: 'ООО', kpp: '007107001' }).success).toBe(false);
  });

  it('ОГРНИП с переставленными цифрами не проходит', () => {
    expect(legalSchema.parse({ form: 'ИП', ogrn: OGRNIP }).ogrn).toBe(OGRNIP);
    expect(legalSchema.safeParse({ form: 'ИП', ogrn: '314710700012364' }).success).toBe(false);
  });

  /* Номер копируют из выписки вместе с пробелами — это особенность источника,
     а не ошибка человека. */
  it('пробелы внутри номера вычищаются, заглушка сидов остаётся заметной', () => {
    expect(legalSchema.parse({ form: 'ООО', inn: '710 702 3451' }).inn).toBe(INN_OOO);
    expect(legalSchema.parse({ form: 'ИП', inn: SETTING_PLACEHOLDER }).inn).toBe(
      SETTING_PLACEHOLDER,
    );
  });

  it('незаполненные реквизиты сохраняются: группу заполняют постепенно', () => {
    expect(legalSchema.parse({ form: 'ИП' })).toMatchObject({ inn: '', ogrn: '', regDate: '' });
  });

  it('дата регистрации календарная, а не любая строка из цифр', () => {
    expect(legalSchema.parse({ form: 'ИП', regDate: '2015-03-12' })).toMatchObject({
      regDate: '2015-03-12',
    });
    expect(legalSchema.safeParse({ form: 'ИП', regDate: '2015-02-30' }).success).toBe(false);
    expect(legalSchema.safeParse({ form: 'ИП', regDate: '12.03.2015' }).success).toBe(false);
  });

  /* Ключ счёта считается вместе с БИК: номер, верный в одном банке, в другом
     неверен — поэтому проверка стоит на группе, а не на поле. */
  it('счёт сходится с БИК, а без БИК не проверяется вовсе', () => {
    const bank = { bankBik: BIK, bankAccount: ACCOUNT, bankCorrAccount: CORR_ACCOUNT };

    expect(legalSchema.parse({ form: 'ООО', ...bank })).toMatchObject(bank);
    expect(
      legalSchema.safeParse({ form: 'ООО', bankBik: BIK, bankAccount: '40702810700000000002' })
        .success,
    ).toBe(false);

    const noBik = legalSchema.safeParse({ form: 'ООО', bankAccount: ACCOUNT });
    expect(noBik.success).toBe(false);
    expect(noBik.success === false && noBik.error.issues[0]?.path).toEqual(['bankBik']);
  });
});
