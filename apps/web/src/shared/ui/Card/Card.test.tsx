import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('рисует содержимое', () => {
    render(<Card>Монтаж под ключ</Card>);
    expect(screen.getByText('Монтаж под ключ')).toBeInTheDocument();
  });

  it('меняет тег по props as — карточка отзыва должна быть article', () => {
    render(<Card as="article">Отзыв</Card>);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('пробрасывает атрибуты контейнера', () => {
    render(
      <Card aria-label="Карточка модели" data-testid="model">
        09
      </Card>,
    );
    expect(screen.getByTestId('model')).toHaveAttribute('aria-label', 'Карточка модели');
  });
});
