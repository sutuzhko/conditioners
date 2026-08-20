import { describe, expect, it } from 'vitest';

import { SETTING_PLACEHOLDER, findSettingGaps } from './readiness';

describe('findSettingGaps', () => {
  it('находит заглушку сидов на любой глубине', () => {
    const gaps = findSettingGaps('contacts', {
      phones: [SETTING_PLACEHOLDER, '+79001234567'],
      email: 'mail@example.ru',
    });

    expect(gaps).toEqual([{ key: 'contacts', path: 'phones.0', reason: 'placeholder' }]);
  });

  it('незаполненные координаты видны как пропуск', () => {
    expect(findSettingGaps('geo', { lat: null, lng: null })).toEqual([
      { key: 'geo', path: 'lat', reason: 'empty' },
      { key: 'geo', path: 'lng', reason: 'empty' },
    ]);
  });

  it('заполненная группа пропусков не даёт', () => {
    expect(
      findSettingGaps('legal', {
        form: 'ИП',
        name: 'Иванов И. И.',
        inn: '710000000000',
        ogrn: '300000000000000',
        address: 'Тула, ул. Примерная, 1',
      }),
    ).toEqual([]);
  });

  it('пустая необязательная строка пропуском не считается', () => {
    expect(findSettingGaps('company', { name: 'ТулаКлимат', tagline: '' })).toEqual([]);
  });
});
