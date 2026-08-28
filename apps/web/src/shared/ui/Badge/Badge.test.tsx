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

  /* 🔴 По умолчанию плашка не переносится: «Класс 09», сломанный пополам,
     читается как ошибка вёрстки. Но там, где текст приходит из настроек, длину
     задаёт владелец, и плашка обязана переносить строку (ADR-126). */
  it('плашка с текстом из настроек переносит строку, обычная — нет', () => {
    const { container: plain } = render(<Badge>Тула и область — выезд в день обращения</Badge>);
    const { container: wrapped } = render(
      <Badge wrap>Тула и область — выезд в день обращения</Badge>,
    );

    expect(wrapped.firstElementChild?.className).not.toBe(plain.firstElementChild?.className);
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
