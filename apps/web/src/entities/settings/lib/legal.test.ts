import { describe, expect, it } from 'vitest';

import type { LegalCompany, LegalEntrepreneur } from '@/entities/settings/model';

import { legalShortTitle, legalTitle, publicRequisites } from './legal';

/**
 * Тип ветви, а не общий `Legal`: здесь проверяется показ реквизитов заведомо
 * одной формы, и объединение мешало бы дописывать в фикстуру поле за полем.
 * Номера с верными контрольными разрядами — их проверяет схема (`model.test`).
 */
const legalIp: LegalEntrepreneur = {
  form: 'ИП',
  name: 'Демонстрационный Демонстрат Демонстратович',
  inn: '710703123450',
  ogrn: '314710700012346',
  regDate: '2015-03-12',
  regAuthority: 'Межрайонная ИФНС России № 10 по Тульской области',
  address: '300000, Тула, Примерная улица, 1',
  bankName: '',
  bankBik: '',
  bankAccount: '',
  bankCorrAccount: '',
};

const legalOoo: LegalCompany = {
  form: 'ООО',
  name: '«Демонстрация»',
  shortName: '«Демо»',
  inn: '7107023451',
  kpp: '710701001',
  ogrn: '1027107001239',
  address: '300000, Тула, Примерная улица, 1, офис 5',
  director: 'Демонстрационный Д. Д.',
  directorTitle: 'Директор',
  bankName: '',
  bankBik: '',
  bankAccount: '',
  bankCorrAccount: '',
};

describe('legalTitle', () => {
  it('подставляет форму регистрации перед наименованием', () => {
    expect(legalTitle(legalIp)).toBe('ИП Демонстрационный Демонстрат Демонстратович');
    expect(legalTitle(legalOoo)).toBe('ООО «Демонстрация»');
  });

  it('не дублирует форму, если владелец вписал её в наименование', () => {
    expect(legalTitle({ ...legalIp, name: 'ИП Демонстрационный Д. Д.' })).toBe(
      'ИП Демонстрационный Д. Д.',
    );
    expect(legalTitle({ ...legalOoo, name: 'ооо «Демонстрация»' })).toBe('ооо «Демонстрация»');
  });

  it('без наименования остаётся одна форма регистрации', () => {
    expect(legalTitle({ ...legalIp, name: '' })).toBe('ИП');
  });
});

describe('legalShortTitle', () => {
  it('у общества берёт сокращённое наименование', () => {
    expect(legalShortTitle(legalOoo)).toBe('ООО «Демо»');
  });

  it('без сокращённого возвращается к полному', () => {
    expect(legalShortTitle({ ...legalOoo, shortName: '' })).toBe('ООО «Демонстрация»');
  });

  it('у предпринимателя сокращённого наименования не бывает', () => {
    expect(legalShortTitle(legalIp)).toBe(legalTitle(legalIp));
  });
});

describe('publicRequisites', () => {
  /**
   * 🔴 Место регистрации предпринимателя — как правило, домашний адрес, то
   * есть персональные данные (PROJECT §5.1). Публиковать его не требуется:
   * потребителю показывается фактический адрес приёма из группы `address`.
   */
  it('адрес регистрации предпринимателя на сайт не выводится', () => {
    const keys = publicRequisites(legalIp).map((row) => row.key);

    expect(keys).toEqual(['inn', 'ogrn', 'regDate', 'regAuthority']);
    expect(publicRequisites(legalIp).some((row) => row.value.includes('Примерная'))).toBe(false);
  });

  it('у предпринимателя номер называется ОГРНИП, а дата читается человеком', () => {
    const rows = publicRequisites(legalIp);

    expect(rows.find((row) => row.key === 'ogrn')?.label).toBe('ОГРНИП');
    expect(rows.find((row) => row.key === 'regDate')?.value).toBe('12 марта 2015');
  });

  /** КПП, руководитель и банковские реквизиты нужны счетам, а не витрине. */
  it('у общества публикуются ИНН, ОГРН и место нахождения', () => {
    const rows = publicRequisites(legalOoo);

    expect(rows.map((row) => row.key)).toEqual(['inn', 'ogrn', 'address']);
    expect(rows.find((row) => row.key === 'ogrn')?.label).toBe('ОГРН');
  });

  it('незаполненный реквизит не превращается в пустую строку таблицы', () => {
    expect(
      publicRequisites({ ...legalIp, regAuthority: '', ogrn: '' }).map((row) => row.key),
    ).toEqual(['inn', 'regDate']);
  });
});
