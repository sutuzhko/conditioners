import { describe, expect, it } from 'vitest';
import { formatAddress, ogrnLabel } from './lib';
import { addressEmpty, addressFixture, legalIp, legalOoo } from './fixtures';

describe('ogrnLabel', () => {
  it('у ИП это ОГРНИП', () => {
    expect(ogrnLabel(legalIp)).toBe('ОГРНИП');
  });

  it('у ООО это ОГРН', () => {
    expect(ogrnLabel(legalOoo)).toBe('ОГРН');
  });
});

describe('formatAddress', () => {
  it('собирает строку из частей адреса', () => {
    expect(formatAddress(addressFixture)).toBe('300000, Тула, ул. Демонстрационная, 1, оф. 5');
  });

  it('пропускает незаполненные части', () => {
    expect(formatAddress({ ...addressFixture, office: '', postalCode: '' })).toBe(
      'Тула, ул. Демонстрационная, 1',
    );
  });

  it('пустой адрес даёт пустую строку', () => {
    expect(formatAddress(addressEmpty)).toBe('');
  });

  it('один индекс без частей адреса возвращается как есть', () => {
    expect(formatAddress({ ...addressEmpty, postalCode: '300000' })).toBe('300000');
  });
});
