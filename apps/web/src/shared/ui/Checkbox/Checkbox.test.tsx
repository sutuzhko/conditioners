import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('переключается кликом по метке', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Нужна штроба" />);

    await user.click(screen.getByText('Нужна штроба'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('переключается пробелом с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Нужна штроба" />);

    await user.tab();
    await user.keyboard(' ');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('ссылка внутри метки остаётся ссылкой и доступна с клавиатуры', async () => {
    const user = userEvent.setup();
    render(
      <Checkbox
        label={
          <>
            Принимаю <a href="/privacy">политику</a>
          </>
        }
      />,
    );

    const link = screen.getByRole('link', { name: 'политику' });
    expect(link).toHaveAttribute('href', '/privacy');

    // по спецификации HTML клик по интерактивному потомку метки не активирует
    // саму метку, поэтому проверяем главное: до ссылки можно дойти табом
    await user.tab();
    await user.tab();
    expect(link).toHaveFocus();
  });

  it('ошибка помечает флажок и озвучивается', () => {
    render(<Checkbox label="Согласие" error="Без согласия заявку принять нельзя" />);

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Без согласия заявку принять нельзя');
  });

  it('отключённый флажок не переключается', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Согласие" disabled />);

    await user.click(screen.getByText('Согласие'));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  /* 🔴 Граница контрола обязана держать 3:1 (WCAG 1.4.11, ADR-181): без неё
     пустой флажок неотличим от почти белой заливки поля. `--line-strong` даёт 1,48:1 — вдвое ниже нормы. */
  it('🔴 граница не возвращается на --line-strong', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'Checkbox.module.css'),
      'utf8',
    );

    expect(css).not.toContain('var(--line-strong)');
  });
});
