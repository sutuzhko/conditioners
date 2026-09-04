import { describe, expect, it } from 'vitest';

import { buildSerpSnippet } from './serp';

const base = {
  title: 'Почему монтаж стоит 6 000 ₽',
  seoTitle: '',
  excerpt: 'Разбираем смету монтажа по пунктам.',
  seoDescription: '',
  slug: 'pochemu-montazh-6000',
  siteUrl: 'https://example.test',
  titleSuffix: 'ТулаКлимат',
};

describe('Превью выдачи для статьи', () => {
  /**
   * 🔴 Те же правила, что на странице статьи: без своего заголовка к
   * названию дописывается приписка бренда, со своим — не дописывается.
   */
  it('без своего заголовка дописывает приписку бренда', () => {
    expect(buildSerpSnippet(base).title).toBe('Почему монтаж стоит 6 000 ₽ | ТулаКлимат');
  });

  it('свой заголовок остаётся как есть — владелец писал его под выдачу', () => {
    const snippet = buildSerpSnippet({ ...base, seoTitle: 'Монтаж кондиционера в Туле' });

    expect(snippet.title).toBe('Монтаж кондиционера в Туле');
  });

  it('без своего описания в выдачу идёт анонс', () => {
    expect(buildSerpSnippet(base).description).toBe(base.excerpt);
  });

  it('каноникал вычисляется из адреса сайта и слага, а не вводится руками', () => {
    expect(buildSerpSnippet(base).canonical).toBe(
      'https://example.test/knowledge/pochemu-montazh-6000',
    );
  });

  /** Пустой слаг — статья ещё не имеет адреса: показывать выдуманный нельзя. */
  it('без слага показывает корень сайта, а не выдуманный адрес', () => {
    expect(buildSerpSnippet({ ...base, slug: '  ' }).canonical).toBe('https://example.test/');
  });

  it('крошки читаются так же, как в выдаче', () => {
    expect(buildSerpSnippet(base).crumbs).toBe('example.test › knowledge › pochemu-montazh-6000');
  });
});
