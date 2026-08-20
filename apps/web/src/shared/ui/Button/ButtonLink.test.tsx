import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ButtonLink } from './ButtonLink';

// В проекте включён typedRoutes: href проверяется компилятором по фактически
// существующим маршрутам. Пока страницы кластера не созданы, в тестах — корень.
describe('ButtonLink', () => {
  it('остаётся ссылкой, а не кнопкой — её должно быть видно роботу', () => {
    render(<ButtonLink href="/">Смотреть каталог</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Смотреть каталог' });
    expect(link).toHaveAttribute('href', '/');
  });

  it('доступна с клавиатуры', async () => {
    render(<ButtonLink href="/">Цены</ButtonLink>);

    screen.getByRole('link').focus();
    expect(screen.getByRole('link')).toHaveFocus();
  });

  it('пробрасывает атрибуты якоря', () => {
    render(
      <ButtonLink href="/" rel="nofollow" aria-label="Каталог кондиционеров">
        Каталог
      </ButtonLink>,
    );

    expect(screen.getByRole('link', { name: 'Каталог кондиционеров' })).toHaveAttribute(
      'rel',
      'nofollow',
    );
  });
});
