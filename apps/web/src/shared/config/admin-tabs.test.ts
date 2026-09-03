import { describe, expect, it } from 'vitest';

import { PANEL_TABS, panelTabSchema, resolvePanelTab, type PanelTabSection } from './admin-tabs';

/**
 * Вкладки макета — страница «Вкладки» холста разбора (issue #339).
 *
 * Список продублирован здесь намеренно: тест обязан сверять словарь с
 * макетом, а не с самим собой. Разошлись — падает он, а не раздел через
 * месяц.
 */
const MOCKUP: Record<PanelTabSection, readonly string[]> = {
  orderCard: ['job', 'materials', 'checklist', 'documents', 'history'],
  orders: ['active', 'new', 'history', 'declined', 'all'],
  clientCard: ['data', 'orders', 'units'],
  staffCard: ['account', 'orders', 'payouts', 'notes'],
  stock: ['stock', 'log', 'zones'],
  reviews: ['pending', 'published', 'rejected', 'all'],
  article: ['text', 'seo', 'publish'],
  overview: ['overview', 'work', 'money'],
};

describe('словарь вкладок панели', () => {
  it('каждой вкладке макета соответствует ключ, и лишних ключей нет', () => {
    expect(PANEL_TABS).toEqual(MOCKUP);
  });

  it('вкладок ровно тридцать — столько же, сколько на макете', () => {
    const total = Object.values(PANEL_TABS).reduce((count, tabs) => count + tabs.length, 0);

    expect(total).toBe(30);
  });

  it('🔴 ключи по-английски: латиница в нижнем регистре, без транслита и разделителей', () => {
    const keys = Object.values(PANEL_TABS).flat();

    for (const key of keys) {
      expect(key).toMatch(/^[a-z]+$/);
    }

    /* Транслит ловится не регуляркой, а сверкой с макетом выше: `zakaz`
       прошёл бы любой шаблон. Здесь остаётся то, что шаблон видит сам —
       кириллица, дефисы и заглавные буквы в адресе. */
    expect(keys.join('')).not.toMatch(/[А-Яа-яЁё]/);
  });

  it('порядок ключей — порядок вкладок на экране: первая вкладка открывается по умолчанию', () => {
    expect(PANEL_TABS.reviews[0]).toBe('pending');
    expect(PANEL_TABS.orders[0]).toBe('active');
    expect(PANEL_TABS.orderCard[0]).toBe('job');
  });
});

describe('разбор вкладки из адреса', () => {
  it('известное значение проходит как есть', () => {
    expect(resolvePanelTab(PANEL_TABS.reviews, 'rejected')).toBe('rejected');
  });

  it('параметра нет вовсе — первая вкладка', () => {
    expect(resolvePanelTab(PANEL_TABS.reviews, undefined)).toBe('pending');
    expect(resolvePanelTab(PANEL_TABS.reviews, null)).toBe('pending');
  });

  it('опечатка — первая вкладка', () => {
    expect(resolvePanelTab(PANEL_TABS.reviews, 'pendign')).toBe('pending');
  });

  it('🔴 ключ чужого раздела — первая вкладка: словарь у каждого раздела свой', () => {
    expect(resolvePanelTab(PANEL_TABS.reviews, 'materials')).toBe('pending');
    expect(resolvePanelTab(PANEL_TABS.orders, 'seo')).toBe('active');
  });

  it('длинная строка и не строка вовсе — первая вкладка, без исключения', () => {
    expect(resolvePanelTab(PANEL_TABS.orders, 'x'.repeat(4096))).toBe('active');
    expect(resolvePanelTab(PANEL_TABS.orders, 42)).toBe('active');
    expect(resolvePanelTab(PANEL_TABS.orders, ['active'])).toBe('active');
  });

  it('разбор идёт схемой Zod: её можно вставить в схему параметров страницы', () => {
    const schema = panelTabSchema(PANEL_TABS.article);

    expect(schema.parse('seo')).toBe('seo');
    expect(schema.parse('мусор')).toBe('text');
  });

  it('подмножество вкладок разбирается тем же разбором: собранных вкладок бывает меньше', () => {
    const built = ['job', 'checklist'] as const;

    expect(resolvePanelTab(built, 'materials')).toBe('job');
    expect(resolvePanelTab(built, 'checklist')).toBe('checklist');
  });
});
