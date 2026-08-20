import { describe, expect, it } from 'vitest';
import { formatAddress, legalTitle, ogrnLabel } from './lib';
import { addressEmpty, addressFixture, legalEmpty, legalIp, legalOoo } from './fixtures';

describe('legalTitle', () => {
  it('подставляет форму собственности перед наименованием', () => {
    expect(legalTitle(legalIp)).toBe('ИП Демонстрационный Д. Д.');
    expect(legalTitle(legalOoo)).toBe('ООО «Демонстрация»');
  });

  it('не дублирует форму, если владелец вписал её в наименование', () => {
    expect(legalTitle({ ...legalIp, name: 'ИП Демонстрационный Д. Д.' })).toBe(
      'ИП Демонстрационный Д. Д.',
    );
    expect(legalTitle({ ...legalOoo, name: 'ооо «Демонстрация»' })).toBe('ооо «Демонстрация»');
  });

  it('без наименования остаётся одна форма собственности', () => {
    expect(legalTitle(legalEmpty)).toBe('ИП');
  });
});

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
