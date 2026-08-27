import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as LeadContextStore from './context';
import { forgetLeadContext, readLeadContext, rememberLeadContext } from './context';

/** Снимок расчёта: столько, сколько нужно схеме, и ни строкой больше. */
const estimate = {
  params: [{ label: 'Класс мощности', value: '09 · до 27 м²' }],
  lines: [{ label: 'Базовый монтаж, класс 09', amount: 6000 }],
  perUnit: null,
  qty: 1,
  total: 6000,
};

const model = { slug: 'split-09', name: 'Сплит-система 09', price: 34_900, oldPrice: null };

/**
 * Свежий экземпляр хранилища. Модульный синглтон читает `sessionStorage` один
 * раз за жизнь страницы, поэтому переход между страницами — это новый модуль,
 * а не новый вызов.
 */
async function reloaded(): Promise<typeof LeadContextStore> {
  vi.resetModules();
  return import('./context');
}

beforeEach(() => {
  sessionStorage.clear();
  forgetLeadContext();
});

describe('хранилище контекста заявки', () => {
  it('складывает части, а не замещает снимок целиком', () => {
    rememberLeadContext({ estimate });
    rememberLeadContext({ liked: [model] });

    expect(readLeadContext()?.estimate?.total).toBe(6000);
    expect(readLeadContext()?.liked).toHaveLength(1);
  });

  it('переживает переход на другую страницу той же вкладки', async () => {
    rememberLeadContext({ model });

    const next = await reloaded();
    expect(next.readLeadContext()?.model?.slug).toBe('split-09');
  });

  it('повторная запись того же снимка оставляет прежнюю ссылку', () => {
    rememberLeadContext({ model });
    const before = readLeadContext();

    // компонент, публикующий снимок при монтировании, не обязан ничего будить
    rememberLeadContext({ model: { ...model } });

    expect(readLeadContext()).toBe(before);
  });

  it('«не прикреплять» стирает снимок и из вкладки тоже', () => {
    rememberLeadContext({ estimate });
    forgetLeadContext();

    expect(readLeadContext()).toBeNull();
    expect(sessionStorage.getItem('tk-lead-context')).toBeNull();
  });

  it('чужая запись в хранилище — это отсутствие контекста, а не падение', async () => {
    sessionStorage.setItem('tk-lead-context', 'не json');

    const next = await reloaded();
    expect(next.readLeadContext()).toBeNull();
    expect(() => next.rememberLeadContext({ model })).not.toThrow();
    expect(next.readLeadContext()?.model?.slug).toBe('split-09');
  });

  it('подделанная запись в хранилище отбрасывается схемой', async () => {
    sessionStorage.setItem('tk-lead-context', JSON.stringify({ model: { slug: 'a', price: -1 } }));

    const next = await reloaded();
    expect(next.readLeadContext()).toBeNull();
  });
});
