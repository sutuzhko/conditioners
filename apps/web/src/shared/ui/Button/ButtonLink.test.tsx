import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ButtonLink } from './ButtonLink';

describe('ButtonLink', () => {
  it('остаётся ссылкой, а не кнопкой — её должно быть видно роботу', () => {
    render(<ButtonLink href="/katalog">Смотреть каталог</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Смотреть каталог' });
    expect(link).toHaveAttribute('href', '/katalog');
  });

  it('доступна с клавиатуры', async () => {
    render(<ButtonLink href="/ceny">Цены</ButtonLink>);

    screen.getByRole('link').focus();
    expect(screen.getByRole('link')).toHaveFocus();
  });

  it('пробрасывает атрибуты якоря', () => {
    render(
      <ButtonLink href="/katalog" rel="nofollow" aria-label="Каталог кондиционеров">
        Каталог
      </ButtonLink>,
    );

    expect(screen.getByRole('link', { name: 'Каталог кондиционеров' })).toHaveAttribute(
      'rel',
      'nofollow',
    );
  });
});
