import { describe, expect, it } from 'vitest';

import {
  isBankAccount,
  isBik,
  isCorrAccount,
  isInnCompany,
  isInnPerson,
  isKpp,
  isOgrn,
  isOgrnip,
} from './requisites';

/**
 * Номера юрлиц взяты настоящие и публичные — так проверяется алгоритм, а не
 * собственное представление о нём: сконструированный «валидный» номер пройдёт
 * и через ошибочную формулу, если конструировали той же ошибочной формулой.
 *
 * Там, где публичного примера под рукой нет (ОГРНИП, счета), номер собран
 * арифметически: контрольный разряд дописан по алгоритму из документации ФНС
 * и Положения Банка России, а не подобран под результат.
 */
const SBER_INN = '7707083893';
const SBER_OGRN = '1027700132195';
const SBER_BIK = '044525225';
const SBER_CORR_ACCOUNT = '30101810400000000225';

/** Расчётный счёт с ключом, посчитанным под БИК Сбербанка. */
const SETTLEMENT_ACCOUNT = '40702810380000000002';

/** ИНН физлица: одиннадцатый и двенадцатый разряды дописаны по алгоритму. */
const PERSON_INN = '710703123450';

/** ОГРНИП: пятнадцатый разряд — младшая цифра остатка от деления на 13. */
const ENTREPRENEUR_OGRNIP = '314710700000190';

describe('isInnCompany', () => {
  it('настоящий ИНН юрлица проходит', () => {
    expect(isInnCompany(SBER_INN)).toBe(true);
    expect(isInnCompany('7736207543')).toBe(true);
    expect(isInnCompany('7710140679')).toBe(true);
  });

  it('🔴 переставленные цифры не проходят — ради этого и считается контрольный разряд', () => {
    expect(isInnCompany('7707083983')).toBe(false);
    expect(isInnCompany('7770083893')).toBe(false);
  });

  it('неверный контрольный разряд не проходит', () => {
    expect(isInnCompany('7707083894')).toBe(false);
  });

  it('🔴 ИНН из двенадцати цифр — не опечатка, а не та форма собственности', () => {
    expect(isInnCompany(PERSON_INN)).toBe(false);
    expect(isInnCompany('770708389')).toBe(false);
  });

  it('буквы, пробелы и пустая строка не проходят', () => {
    expect(isInnCompany('770708389A')).toBe(false);
    expect(isInnCompany('7707 083893')).toBe(false);
    expect(isInnCompany(' 7707083893')).toBe(false);
    expect(isInnCompany('')).toBe(false);
  });
});

describe('isInnPerson', () => {
  it('ИНН физлица с обоими контрольными разрядами проходит', () => {
    expect(isInnPerson(PERSON_INN)).toBe(true);
    expect(isInnPerson('713001010130')).toBe(true);
  });

  it('🔴 проверяются оба разряда: верный одиннадцатый не спасает неверный двенадцатый', () => {
    expect(isInnPerson('710703123451')).toBe(false);
    expect(isInnPerson('710703123440')).toBe(false);
  });

  it('переставленные цифры не проходят', () => {
    expect(isInnPerson('701703123450')).toBe(false);
    expect(isInnPerson('710730123450')).toBe(false);
  });

  it('ИНН из десяти цифр — форма выбрана не та', () => {
    expect(isInnPerson(SBER_INN)).toBe(false);
    expect(isInnPerson('7107031234500')).toBe(false);
  });

  it('буквы, пробелы и пустая строка не проходят', () => {
    expect(isInnPerson('71070312345O')).toBe(false);
    expect(isInnPerson('7107 03123450')).toBe(false);
    expect(isInnPerson('')).toBe(false);
  });
});

describe('isOgrn', () => {
  it('настоящий ОГРН проходит', () => {
    expect(isOgrn(SBER_OGRN)).toBe(true);
    expect(isOgrn('1027700229193')).toBe(true);
    expect(isOgrn('1027739244741')).toBe(true);
    expect(isOgrn('1027739642281')).toBe(true);
  });

  it('переставленные цифры не проходят', () => {
    expect(isOgrn('1027700132915')).toBe(false);
    expect(isOgrn('1027700131295')).toBe(false);
  });

  it('неверный контрольный разряд не проходит', () => {
    expect(isOgrn('1027700132196')).toBe(false);
  });

  it('длина ОГРНИП для ОГРН не годится', () => {
    expect(isOgrn(ENTREPRENEUR_OGRNIP)).toBe(false);
    expect(isOgrn('102770013219')).toBe(false);
  });

  it('буквы, пробелы и пустая строка не проходят', () => {
    expect(isOgrn('102770013219A')).toBe(false);
    expect(isOgrn('1027700132195 ')).toBe(false);
    expect(isOgrn('')).toBe(false);
  });
});

describe('isOgrnip', () => {
  it('ОГРНИП с верным контрольным разрядом проходит', () => {
    expect(isOgrnip(ENTREPRENEUR_OGRNIP)).toBe(true);
    expect(isOgrnip('304710000000012')).toBe(true);
  });

  it('переставленные цифры не проходят', () => {
    expect(isOgrnip('314170700000190')).toBe(false);
    expect(isOgrnip('341710700000190')).toBe(false);
  });

  it('неверный контрольный разряд не проходит', () => {
    expect(isOgrnip('314710700000191')).toBe(false);
  });

  it('длина ОГРН для ОГРНИП не годится', () => {
    expect(isOgrnip(SBER_OGRN)).toBe(false);
    expect(isOgrnip('3147107000001900')).toBe(false);
  });

  it('буквы, пробелы и пустая строка не проходят', () => {
    expect(isOgrnip('31471070000019A')).toBe(false);
    expect(isOgrnip('314 710700000190')).toBe(false);
    expect(isOgrnip('')).toBe(false);
  });
});

describe('isKpp', () => {
  it('КПП российской организации проходит', () => {
    expect(isKpp('710701001')).toBe(true);
    expect(isKpp('773601001')).toBe(true);
  });

  it('🔴 буквы в коде причины постановки на учёт законны — так оформлены иностранные организации', () => {
    expect(isKpp('7107AB001')).toBe(true);
    expect(isKpp('710751001')).toBe(true);
  });

  it('строчные буквы не проходят: код причины записывается заглавными', () => {
    expect(isKpp('7107ab001')).toBe(false);
  });

  it('нулевого кода региона не бывает', () => {
    expect(isKpp('001701001')).toBe(false);
  });

  it('буквы вне кода причины не проходят', () => {
    expect(isKpp('71A701001')).toBe(false);
    expect(isKpp('71070100A')).toBe(false);
  });

  it('неверная длина, пробелы и пустая строка не проходят', () => {
    expect(isKpp('71070100')).toBe(false);
    expect(isKpp('7107010011')).toBe(false);
    expect(isKpp('7107 01001')).toBe(false);
    expect(isKpp('')).toBe(false);
  });
});

describe('isBik', () => {
  it('настоящий БИК проходит', () => {
    expect(isBik(SBER_BIK)).toBe(true);
    expect(isBik('045004774')).toBe(true);
  });

  it('БИК начинается с кода России', () => {
    expect(isBik('145525225')).toBe(false);
    expect(isBik('054525225')).toBe(false);
  });

  it('неверная длина, буквы, пробелы и пустая строка не проходят', () => {
    expect(isBik('04452522')).toBe(false);
    expect(isBik('0445252250')).toBe(false);
    expect(isBik('04452522A')).toBe(false);
    expect(isBik('044 525225')).toBe(false);
    expect(isBik('')).toBe(false);
  });
});

describe('isBankAccount', () => {
  it('расчётный счёт с верным ключом проходит', () => {
    expect(isBankAccount(SETTLEMENT_ACCOUNT, SBER_BIK)).toBe(true);
  });

  it('🔴 ключ считается вместе с БИК: тот же счёт в другом банке неверен', () => {
    expect(isBankAccount(SETTLEMENT_ACCOUNT, '044525226')).toBe(false);
    expect(isBankAccount(SETTLEMENT_ACCOUNT, '044525201')).toBe(false);
  });

  it('переставленные цифры не проходят', () => {
    expect(isBankAccount('40708210380000000002', SBER_BIK)).toBe(false);
    expect(isBankAccount('40072810380000000002', SBER_BIK)).toBe(false);
  });

  it('🔴 корсчёт вместо расчётного не проходит — это счёт банка, а не компании', () => {
    expect(isBankAccount(SBER_CORR_ACCOUNT, SBER_BIK)).toBe(false);
  });

  it('неверный БИК отвергает счёт целиком', () => {
    expect(isBankAccount(SETTLEMENT_ACCOUNT, '14452522')).toBe(false);
    expect(isBankAccount(SETTLEMENT_ACCOUNT, '')).toBe(false);
  });

  it('неверная длина, буквы, пробелы и пустая строка не проходят', () => {
    expect(isBankAccount('4070281038000000000', SBER_BIK)).toBe(false);
    expect(isBankAccount('407028103800000000020', SBER_BIK)).toBe(false);
    expect(isBankAccount('4070281038000000000A', SBER_BIK)).toBe(false);
    expect(isBankAccount('40702810 380000000002', SBER_BIK)).toBe(false);
    expect(isBankAccount('', SBER_BIK)).toBe(false);
  });
});

describe('isCorrAccount', () => {
  it('настоящий корсчёт банка проходит', () => {
    expect(isCorrAccount(SBER_CORR_ACCOUNT, SBER_BIK)).toBe(true);
    expect(isCorrAccount('30101810400000000005', SBER_BIK)).toBe(true);
  });

  it('🔴 у корсчёта ключ считается по другим разрядам БИК', () => {
    expect(isCorrAccount(SBER_CORR_ACCOUNT, '044535225')).toBe(false);
  });

  it('переставленные цифры не проходят', () => {
    expect(isCorrAccount('30101801400000000005', SBER_BIK)).toBe(false);
    expect(isCorrAccount('30101810400000000252', SBER_BIK)).toBe(false);
  });

  it('расчётный счёт корсчётом не является', () => {
    expect(isCorrAccount(SETTLEMENT_ACCOUNT, SBER_BIK)).toBe(false);
  });

  it('неверный БИК отвергает счёт целиком', () => {
    expect(isCorrAccount(SBER_CORR_ACCOUNT, '30101810')).toBe(false);
    expect(isCorrAccount(SBER_CORR_ACCOUNT, '')).toBe(false);
  });

  it('неверная длина, буквы, пробелы и пустая строка не проходят', () => {
    expect(isCorrAccount('3010181040000000022', SBER_BIK)).toBe(false);
    expect(isCorrAccount('301018104000000002250', SBER_BIK)).toBe(false);
    expect(isCorrAccount('3010181040000000022A', SBER_BIK)).toBe(false);
    expect(isCorrAccount('30101810 400000000225', SBER_BIK)).toBe(false);
    expect(isCorrAccount('', SBER_BIK)).toBe(false);
  });
});
