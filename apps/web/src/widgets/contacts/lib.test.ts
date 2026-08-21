import { describe, expect, it } from 'vitest';

import { addressLine, mapQuery, yandexMapsHref } from './lib';
import { addressEmpty, addressFixture, geoEmpty, geoFixture } from './fixtures';

describe('Адрес и ссылка на карту', () => {
  it('собирает адрес из частей и пропускает незаполненные', () => {
    expect(addressLine(addressFixture)).toBe('Тула, ул. Демонстрационная, 1, оф. 5');
    expect(addressLine({ ...addressFixture, office: '' })).toBe('Тула, ул. Демонстрационная, 1');
    expect(addressLine(addressEmpty)).toBe('');
  });

  it('в запрос к карте добавляет регион: улица без него находится не одна', () => {
    expect(mapQuery(addressFixture)).toBe('Тульская область, Тула, ул. Демонстрационная, 1');
  });

  it('координаты точнее адреса — при них ставится метка', () => {
    const href = yandexMapsHref(addressFixture, geoFixture);

    expect(href).toContain('https://yandex.ru/maps/');
    expect(href).toContain('ll=37.617348,54.193122');
    expect(href).toContain('pt=37.617348,54.193122');
  });

  it('без координат карта ищет по адресу', () => {
    const href = yandexMapsHref(addressFixture, geoEmpty);

    expect(href).toBe(
      'https://yandex.ru/maps/?text=' +
        encodeURIComponent('Тульская область, Тула, ул. Демонстрационная, 1'),
    );
  });

  it('🔴 ни адреса, ни координат — ссылки нет: «открыть в картах» вело бы в пустоту', () => {
    expect(yandexMapsHref(addressEmpty, geoEmpty)).toBeNull();
    expect(yandexMapsHref(addressEmpty)).toBeNull();
  });
});
