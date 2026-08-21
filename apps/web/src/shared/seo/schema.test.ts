import { describe, expect, it } from 'vitest';

import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';

import { absoluteUrl, compact, num, oneOrMany, text, textList } from './schema';

describe('Основа разметки', () => {
  describe('absoluteUrl', () => {
    it('собирает абсолютный адрес без завершающего слэша', () => {
      expect(absoluteUrl('https://site.ru', '/catalog')).toBe('https://site.ru/catalog');
      expect(absoluteUrl('https://site.ru/', 'catalog/')).toBe('https://site.ru/catalog');
    });

    it('корень отдаётся со слэшем — это его единственная форма', () => {
      expect(absoluteUrl('https://site.ru')).toBe('https://site.ru/');
      expect(absoluteUrl('https://site.ru/', '/')).toBe('https://site.ru/');
    });

    it('готовый абсолютный адрес не трогает: картинка может лежать на другом домене', () => {
      expect(absoluteUrl('https://site.ru', 'https://cdn.ru/a.png')).toBe('https://cdn.ru/a.png');
    });
  });

  describe('text', () => {
    it('🔴 заглушка сидов приравнивается к пустоте', () => {
      expect(text(SETTING_PLACEHOLDER)).toBeUndefined();
      expect(text(`  ${SETTING_PLACEHOLDER}  `)).toBeUndefined();
    });

    it('пустое и отсутствующее значение поля не создают', () => {
      expect(text('')).toBeUndefined();
      expect(text('   ')).toBeUndefined();
      expect(text(null)).toBeUndefined();
      expect(text(undefined)).toBeUndefined();
    });

    it('обычную строку отдаёт без пробелов по краям', () => {
      expect(text('  Тула ')).toBe('Тула');
    });
  });

  it('textList выбрасывает пустоты, а пустой список превращает в отсутствие поля', () => {
    expect(textList(['a', '', null, SETTING_PLACEHOLDER, 'b'])).toEqual(['a', 'b']);
    expect(textList(['', null])).toBeUndefined();
    expect(textList(undefined)).toBeUndefined();
  });

  it('oneOrMany не оборачивает единственное значение в массив', () => {
    expect(oneOrMany(['+70000000000'])).toBe('+70000000000');
    expect(oneOrMany(['a', 'b'])).toEqual(['a', 'b']);
    expect(oneOrMany(undefined)).toBeUndefined();
  });

  it('num отбрасывает NaN и бесконечность — в JSON они превращаются в null', () => {
    expect(num(0)).toBe(0);
    expect(num(Number.NaN)).toBeUndefined();
    expect(num(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(num(null)).toBeUndefined();
  });

  it('compact убирает пустые поля и пустые списки', () => {
    expect(compact({ '@type': 'Thing', name: 'a', url: undefined, sameAs: [] })).toEqual({
      '@type': 'Thing',
      name: 'a',
    });
  });
});
