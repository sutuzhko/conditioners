import { describe, expect, it } from 'vitest';

import type { Legal } from '@/entities/settings/model';

import { legalTitle } from './legal';

const legalIp: Legal = {
  form: 'ИП',
  name: 'Демонстрационный Д. Д.',
  inn: '710000000000',
  ogrn: '300000000000000',
  address: '300000, Тула, Примерная улица, 1',
};

const legalOoo: Legal = { ...legalIp, form: 'ООО', name: '«Демонстрация»' };
const legalEmpty: Legal = { ...legalIp, name: '' };

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
