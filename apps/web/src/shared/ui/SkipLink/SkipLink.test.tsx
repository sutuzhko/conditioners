import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('это ссылка на якорь содержимого с понятным именем', () => {
    render(<SkipLink href="#top">К содержимому</SkipLink>);

    expect(screen.getByRole('link', { name: 'К содержимому' })).toHaveAttribute('href', '#top');
  });

  it('первой получает фокус с клавиатуры, хотя спрятана с глаз', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SkipLink href="#top">К содержимому</SkipLink>
        <a href="#catalog">Каталог</a>
      </>,
    );

    await user.tab();

    expect(screen.getByRole('link', { name: 'К содержимому' })).toHaveFocus();
  });
});
