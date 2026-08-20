import { describe, expect, it } from 'vitest';

import { slugify, transliterate, uniqueSlug } from './slug';

describe('transliterate', () => {
  it('переводит кириллицу в латиницу', () => {
    expect(transliterate('Кондиционер')).toBe('kondicioner');
    expect(transliterate('Тула')).toBe('tula');
    expect(transliterate('Щётка')).toBe('schetka');
    expect(transliterate('Объявление')).toBe('obyavlenie');
    expect(transliterate('Жёлтый')).toBe('zheltyy');
  });

  it('латиницу и цифры оставляет как есть', () => {
    expect(transliterate('Split 09')).toBe('split 09');
  });
});

describe('slugify', () => {
  it('делает адрес из заголовка', () => {
    expect(slugify('Как выбрать кондиционер')).toBe('kak-vybrat-kondicioner');
    expect(slugify('Сплит-система 09')).toBe('split-sistema-09');
  });

  it('схлопывает разделители и обрезает края', () => {
    expect(slugify('  Цены — 2026 / монтаж!  ')).toBe('ceny-2026-montazh');
  });

  it('строка без букв и цифр даёт пустой слаг — решение принимает вызывающий', () => {
    expect(slugify('— !!! —')).toBe('');
    expect(slugify('')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('свободный слаг возвращается как есть', () => {
    expect(uniqueSlug('ceny', [])).toBe('ceny');
    expect(uniqueSlug('ceny', ['katalog'])).toBe('ceny');
  });

  it('занятый слаг получает числовой суффикс', () => {
    expect(uniqueSlug('ceny', ['ceny'])).toBe('ceny-2');
    expect(uniqueSlug('ceny', ['ceny', 'ceny-2', 'ceny-3'])).toBe('ceny-4');
  });

  it('пропуски в нумерации занимаются', () => {
    expect(uniqueSlug('ceny', ['ceny', 'ceny-3'])).toBe('ceny-2');
  });
});
