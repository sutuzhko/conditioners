import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';

import { ArticleBody } from './ArticleBody';
import { bodyFixture } from './fixtures';

function renderBody(body: string) {
  return render(<ArticleBody blocks={parseArticleBody(body)} />);
}

describe('Текст статьи', () => {
  it('рисует все виды узлов дерева', () => {
    const { container } = renderBody(bodyFixture);

    expect(screen.getByRole('heading', { level: 2, name: /Шаг 1/ })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Поправки, о которых забывают' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/Кондиционер выбирают один раз/)).toBeInTheDocument();
    expect(container.querySelectorAll('aside')).toHaveLength(1);
  });

  it('`**жирный**` становится `strong`, а не текстом со звёздочками', () => {
    const { container } = renderBody('Правило: **1 кВт** на 10 м²');

    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('1 кВт');
    expect(container.textContent).not.toContain('**');
  });

  it('🔴 своего `h1` в тексте статьи нет: он один на странице', () => {
    const { container } = renderBody(bodyFixture);

    expect(container.querySelector('h1')).toBeNull();
  });

  it('🔴 уровни заголовков идут без пропусков', () => {
    const { container } = renderBody('### Третий без второго\n\n## Второй');

    expect([...container.querySelectorAll('h2, h3')].map((el) => el.tagName)).toEqual(['H2', 'H2']);
  });

  it('у заголовков второго уровня есть якоря — на них ссылается оглавление', () => {
    const { container } = renderBody('## Шаг 1. Мощность');

    expect(container.querySelector('h2')?.id).toBe('shag-1-moschnost');
  });

  it('разметка из текста владельца остаётся текстом, а не тегами', () => {
    const { container } = renderBody('## <script>alert(1)</script>\n\n- <b>жирный</b>');

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('пустое тело не ломает вывод', () => {
    const { container } = renderBody('   \n\n  ');

    expect(container.querySelectorAll('p, h2, h3, ul, aside')).toHaveLength(0);
  });
});
