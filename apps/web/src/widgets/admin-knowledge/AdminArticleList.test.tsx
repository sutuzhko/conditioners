import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminArticleList } from './AdminArticleList';
import { adminKnowledgeContent as texts } from './content';
import { articleRowsFixture } from './fixtures';

describe('Список статей в админке', () => {
  it('показывает и черновики: черновик — не отсутствующая статья', () => {
    render(<AdminArticleList articles={articleRowsFixture} />);

    expect(screen.getByText('Черновик про монтаж в панельном доме')).toBeInTheDocument();
    expect(screen.getByText(texts.draft)).toBeInTheDocument();
  });

  it('каждая строка ведёт в правку своей статьи', () => {
    render(<AdminArticleList articles={articleRowsFixture} />);

    expect(
      screen.getByRole('link', { name: texts.editLabel('Как часто чистить кондиционер') }),
    ).toHaveAttribute('href', '/admin/knowledge/2');
  });

  it('пустой раздел объясняет, зачем нужны статьи', () => {
    render(<AdminArticleList articles={[]} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
