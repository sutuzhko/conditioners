import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { NavState } from './NavState';
import { NavToggle } from './NavToggle';
import { adminShellContent as texts } from './content';
import { NAV_COOKIE } from './navCookie';

function shell(open: boolean) {
  return render(
    <NavState initialOpen={open}>
      <NavToggle />
      <nav aria-label={texts.navLabel} />
    </NavState>,
  );
}

beforeEach(() => {
  // cookie записывается для пути `/admin` — со страницы `/` она не читается
  window.history.replaceState({}, '', '/admin/catalog');
  document.cookie = `${NAV_COOKIE}=; path=/admin; max-age=0`;
});

describe('Переключатель колонки разделов', () => {
  it('называет действие, а не состояние: подпись говорит, что произойдёт', () => {
    shell(true);

    expect(screen.getByRole('button', { name: texts.navHide })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('убирает колонку и меняет подпись', async () => {
    const user = userEvent.setup();
    const { container } = shell(true);

    await user.click(screen.getByRole('button', { name: texts.navHide }));

    expect(container.querySelector('[data-nav]')).toHaveAttribute('data-nav', 'off');
    expect(screen.getByRole('button', { name: texts.navShow })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('запоминает выбор в cookie — иначе он теряется на первом же переходе', async () => {
    const user = userEvent.setup();
    shell(true);

    await user.click(screen.getByRole('button', { name: texts.navHide }));

    expect(document.cookie).toContain(`${NAV_COOKIE}=off`);
  });

  it('открывается в том виде, в каком закрыли', () => {
    const { container } = shell(false);

    expect(container.querySelector('[data-nav]')).toHaveAttribute('data-nav', 'off');
    expect(screen.getByRole('button', { name: texts.navShow })).toBeInTheDocument();
  });
});
