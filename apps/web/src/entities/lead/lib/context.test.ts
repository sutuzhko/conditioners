import { describe, expect, it } from 'vitest';

import { formatMoney } from '@/shared/lib/format';

import {
  isEmptyLeadContext,
  leadContextModelText,
  leadContextParamsText,
  leadContextPickText,
  mergeLeadContext,
  parseLeadContext,
} from './context';
import type { LeadContext } from '../model';

/** Снимок расчёта — минимальный, но полный: по нему проверяется разбор. */
const estimate = {
  params: [{ label: 'Класс мощности', value: '09 · до 27 м²' }],
  lines: [{ label: 'Базовый монтаж, класс 09', amount: 6000 }],
  perUnit: null,
  qty: 1,
  total: 6000,
};

const model = { slug: 'split-09', name: 'Сплит-система 09', price: 34_900, oldPrice: null };

describe('контекст заявки — разбор', () => {
  it('принимает снимок целиком и выводит тип из схемы', () => {
    const parsed = parseLeadContext({
      estimate,
      pick: { area: 25, place: 'Квартира', model },
      model: null,
      liked: [model],
    });

    expect(parsed?.estimate?.total).toBe(6000);
    expect(parsed?.pick?.area).toBe(25);
    expect(parsed?.liked).toHaveLength(1);
  });

  it('заполняет умолчаниями то, чего в снимке не было', () => {
    const parsed = parseLeadContext({ estimate });

    expect(parsed?.pick).toBeNull();
    expect(parsed?.model).toBeNull();
    expect(parsed?.liked).toEqual([]);
  });

  it('пустой контекст — это null, а не объект с четырьмя пустыми полями', () => {
    expect(parseLeadContext({})).toBeNull();
    expect(parseLeadContext({ estimate: null, pick: null, model: null, liked: [] })).toBeNull();
    expect(parseLeadContext(null)).toBeNull();
    expect(parseLeadContext(undefined)).toBeNull();
  });

  it('отбрасывает неизвестные ключи, а не спотыкается о них', () => {
    const parsed = parseLeadContext({ estimate, secret: 'нам это не нужно' });

    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed ?? {})).toEqual(['estimate', 'pick', 'model', 'liked']);
  });

  it('подделанный контекст исчезает целиком и ничего не ломает', () => {
    expect(parseLeadContext({ estimate: { total: 'бесплатно' } })).toBeNull();
    expect(parseLeadContext({ pick: { area: -5, place: 'Квартира' } })).toBeNull();
    expect(parseLeadContext('строка вместо объекта')).toBeNull();
    expect(parseLeadContext([1, 2, 3])).toBeNull();
  });

  it('отрицательная цена не проходит: снимок цены — это факт, а не пожелание', () => {
    expect(parseLeadContext({ model: { slug: 'a', name: 'A', price: -1 } })).toBeNull();
  });

  it('подрезает длинный текст вместо того, чтобы потерять весь снимок', () => {
    const long = 'я'.repeat(500);
    const parsed = parseLeadContext({ model: { slug: 'split-09', name: long } });

    expect(parsed?.model?.name.length).toBe(120);
  });

  it('подрезает список отметок: заявка не место для выгрузки каталога', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      slug: `split-${index}`,
      name: `Модель ${index}`,
    }));

    expect(parseLeadContext({ liked: many })?.liked).toHaveLength(12);
  });
});

describe('контекст заявки — дополнение', () => {
  const base: LeadContext = { estimate, pick: null, model: null, liked: [] };

  it('второе действие не отменяет первого', () => {
    const merged = mergeLeadContext(base, { model });

    expect(merged?.estimate?.total).toBe(6000);
    expect(merged?.model?.slug).toBe('split-09');
  });

  it('новая часть замещает старую того же вида', () => {
    const merged = mergeLeadContext(base, {
      estimate: { ...estimate, total: 12_000 },
    });

    expect(merged?.estimate?.total).toBe(12_000);
  });

  it('дополнение пустоты пустотой остаётся пустотой', () => {
    expect(mergeLeadContext(null, {})).toBeNull();
    expect(isEmptyLeadContext({ estimate: null, pick: null, model: null, liked: [] })).toBe(true);
  });
});

describe('контекст заявки — как это читает человек', () => {
  it('цена модели показывается той, что стояла на экране', () => {
    /* Форматирование одно на проект (`formatMoney`), поэтому сверяем с ним, а
       не с литералом: разряды в нём разделены неразрывным пробелом. */
    expect(leadContextModelText(model)).toBe(`Сплит-система 09 — ${formatMoney(34_900)}`);
  });

  it('перечёркнутая цена показывается только тогда, когда она была', () => {
    const text = leadContextModelText({ ...model, oldPrice: 39_900 });

    expect(text).toContain('вместо');
    expect(leadContextModelText({ ...model, price: null })).toBe('Сплит-система 09');
  });

  it('условия расчёта читаются строкой с подписями', () => {
    expect(leadContextParamsText(estimate.params)).toBe('Класс мощности: 09 · до 27 м²');
  });

  it('подбор читается площадью и типом помещения', () => {
    expect(leadContextPickText({ area: 25, place: 'Квартира', model: null })).toContain('25');
    expect(leadContextPickText({ area: 25, place: 'Квартира', model: null })).toContain('Квартира');
  });
});
