import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArticleCover } from './ArticleCover';
import { articleCoverContent as texts } from './content';

describe('Обложка статьи', () => {
  it('без обложки объясняет, что увидит посетитель', () => {
    render(<ArticleCover cover={null} upload={vi.fn()} />);

    expect(screen.getByText(texts.empty)).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.add))).toBeInTheDocument();
  });

  it('с обложкой предлагает замену, а не повторную загрузку', () => {
    render(<ArticleCover cover="/media/cover.jpg" upload={vi.fn()} />);

    expect(screen.getByAltText(texts.previewAlt)).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.replace))).toBeInTheDocument();
    expect(screen.queryByText(texts.empty)).not.toBeInTheDocument();
  });
});
