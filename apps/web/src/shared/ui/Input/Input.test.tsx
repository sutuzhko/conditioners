import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';
import type { FieldVariant } from '../internal/Field';

describe('Input', () => {
  it('подпись связана с полем — клик по ней ставит фокус', async () => {
    const user = userEvent.setup();
    render(<Input label="Телефон" />);

    await user.click(screen.getByText('Телефон'));
    expect(screen.getByLabelText('Телефон')).toHaveFocus();
  });

  it('принимает ввод с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<Input label="Имя" />);

    await user.type(screen.getByLabelText('Имя'), 'Пётр');
    expect(screen.getByLabelText('Имя')).toHaveValue('Пётр');
  });

  it('ошибка помечает поле как невалидное и связывается через aria-describedby', () => {
    render(<Input label="Телефон" error="Введите номер полностью" />);

    const input = screen.getByLabelText('Телефон');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Введите номер полностью');
    expect(screen.getByRole('alert')).toHaveTextContent('Введите номер полностью');
  });

  it('подсказка и ошибка описывают поле одновременно', () => {
    render(<Input label="Телефон" hint="Только для звонка" error="Номер короткий" />);
    expect(screen.getByLabelText('Телефон')).toHaveAccessibleDescription(
      'Только для звонка Номер короткий',
    );
  });

  it('отключённое поле не принимает ввод', async () => {
    const user = userEvent.setup();
    render(<Input label="Имя" disabled />);

    await user.type(screen.getByLabelText('Имя'), 'Пётр');
    expect(screen.getByLabelText('Имя')).toHaveValue('');
  });

  it('обязательность отражается и в разметке, и в подписи', () => {
    render(<Input label="Телефон" required />);
    expect(screen.getByLabelText(/Телефон/)).toBeRequired();
  });
});

describe('Вид поля', () => {
  it('каждый из четырёх видов даёт свой класс', () => {
    const variants: readonly FieldVariant[] = ['flat', 'bordered', 'faded', 'underlined'];
    const classes = variants.map(
      (variant) =>
        render(<Input label="Имя" variant={variant} />).container.querySelector('input')?.className,
    );

    expect(new Set(classes).size).toBe(variants.length);
  });

  it('умолчание — flat: заливка и обводка', () => {
    const auto = render(<Input label="Имя" />).container.querySelector('input')?.className;
    const flat = render(<Input label="Имя" variant="flat" />).container.querySelector(
      'input',
    )?.className;

    expect(auto).toBe(flat);
  });

  /* 🔴 Место под подпись внутри поля резервирует класс, а не «на глаз»: у поля
     без подписи верхний отступ остался бы, и значение висело бы в нижней трети
     коробки. */
  it('место под подпись резервируется только там, где подпись есть', () => {
    const withLabel = render(<Input label="Имя" />).container.querySelector('input')?.className;
    const bare = render(<Input />).container.querySelector('input')?.className;

    expect(withLabel).not.toBe(bare);
  });

  /* 🔴 Тесты на CSS, а не на разметку: jsdom модули не применяет, а перенос
     подписи внутрь поля и тинт ошибки — это правила в файлах стилей, и
     проверить их иначе нечем.

     Признак — `body:has([data-ui='panel'])`, а не сам контейнер панели:
     окно панели уходит порталом в `body` мимо него (ADR-193), и правило,
     написанное через контейнер, до окна не доехало бы. */
  it('🔴 подпись внутрь поля переносит признак документа, а не контейнер панели', () => {
    const css = readFileSync(join(__dirname, '..', 'internal', 'Field.module.css'), 'utf8');

    expect(css).toContain("body:has([data-ui='panel']) .labelInside");
    expect(css).not.toMatch(/\[data-ui='panel'\] \.labelInside/);
  });

  it('🔴 ошибка красит поле тинтом, а не одной рамкой', () => {
    const css = readFileSync(join(__dirname, '..', 'internal', 'control.module.css'), 'utf8');
    const rule = css.slice(css.indexOf('.invalid {'));

    expect(rule.slice(0, rule.indexOf('}'))).toContain('background: var(--error-bg)');
  });

  /* 🔴 Граница поля обязана держать 3:1 (WCAG 1.4.11, ADR-181): пустое поле
     без неё неотличимо от фона. `--line-strong` даёт 1,48:1. */
  it('🔴 граница поля не возвращается на --line-strong', () => {
    const css = readFileSync(join(__dirname, '..', 'internal', 'control.module.css'), 'utf8');
    expect(css).not.toContain('var(--line-strong)');
  });
});
