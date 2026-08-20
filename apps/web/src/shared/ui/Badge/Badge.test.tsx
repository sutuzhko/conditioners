import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('рисует переданный текст', () => {
    render(<Badge>Инвертор</Badge>);
    expect(screen.getByText('Инвертор')).toBeInTheDocument();
  });

  it('плашка скидки остаётся обычным текстом для скринридера', () => {
    render(<Badge variant="sale">−12%</Badge>);
    expect(screen.getByText('−12%')).toBeVisible();
  });

  it('пробрасывает атрибуты доступности', () => {
    render(
      <Badge role="status" aria-label="Скидка двенадцать процентов">
        −12%
      </Badge>,
    );
    expect(screen.getByRole('status')).toHaveAccessibleName('Скидка двенадцать процентов');
  });
});
