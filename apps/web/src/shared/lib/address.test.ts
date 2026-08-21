import { describe, expect, it } from 'vitest';
import { formatAddress } from './address';

const empty = {
  country: 'RU',
  region: '',
  city: '',
  street: '',
  building: '',
  office: '',
  postalCode: '',
};

describe('сборка адреса из частей', () => {
  it('склеивает заполненные части по порядку', () => {
    expect(
      formatAddress({
        ...empty,
        city: 'Тула',
        street: 'ул. Ленина',
        building: '1',
        office: 'оф. 10',
      }),
    ).toBe('Тула, ул. Ленина, 1, оф. 10');
  });

  it('пропускает пустые части, а не оставляет запятые', () => {
    expect(formatAddress({ ...empty, city: 'Тула', building: '1' })).toBe('Тула, 1');
  });

  it('добавляет индекс только по запросу — в контактах он лишний', () => {
    const address = { ...empty, city: 'Тула', postalCode: '300041' };
    expect(formatAddress(address)).toBe('Тула');
    expect(formatAddress(address, { withPostalCode: true })).toBe('300041, Тула');
  });

  it('без частей отдаёт индекс, если он запрошен', () => {
    expect(formatAddress({ ...empty, postalCode: '300041' }, { withPostalCode: true })).toBe(
      '300041',
    );
  });

  it('на полностью пустом адресе не выдумывает содержимое', () => {
    expect(formatAddress(empty)).toBe('');
    expect(formatAddress(empty, { withPostalCode: true })).toBe('');
  });
});
