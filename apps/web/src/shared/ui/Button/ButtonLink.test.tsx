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

  /**
   * `reload` остаётся ссылкой с тем же адресом и тем же именем.
   *
   * 🔴 Больше здесь проверять нечем, и это стоит сказать прямо: обе ветки
   * рисуют `<a href>`, а разница между ними — свойство рантайма Next, а не
   * разметки. В jsdom без роутера `<Link>` нажатие тоже не перехватывает,
   * поэтому проверка «событие не погашено» проходила бы и без `reload` —
   * то есть не проверяла бы ничего. Настоящее доказательство — сквозной
   * сценарий выхода со страницы отказа (`e2e/panel-access.spec.ts`,
   * issue #770); здесь фиксируется только то, что кнопка не перестала быть
   * ссылкой.
   */
  it('с `reload` остаётся ссылкой с тем же адресом', () => {
    render(
      <ButtonLink href="/" reload>
        К заявкам
      </ButtonLink>,
    );

    expect(screen.getByRole('link', { name: 'К заявкам' })).toHaveAttribute('href', '/');
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
