import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PasswordInput } from './PasswordInput';

const meta = {
  title: 'UI Kit/PasswordInput',
  component: PasswordInput,
  args: { label: 'Пароль', autoComplete: 'current-password' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Filled: Story = {
  name: 'Скрыто',
  args: { defaultValue: 'Пароль-владельца-2026' },
};

/** Показ включён: тип поля `text`, имя кнопки и `aria-pressed` перевёрнуты. */
export const Shown: Story = {
  name: 'Показано',
  args: { defaultValue: 'Пароль-владельца-2026' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Показать пароль' }));
    await expect(canvas.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
  },
};

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { label: 'Новый пароль', hint: 'Не меньше 12 знаков', autoComplete: 'new-password' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: { defaultValue: '12345', error: 'Пароль короче 12 знаков' },
};

export const Disabled: Story = {
  name: 'Отключено',
  args: { defaultValue: 'Пароль-владельца-2026', disabled: true },
};

/**
 * То же поле в панели: `data-ui="panel"` включает её геометрию (ADR-187) —
 * пилюля, высота 48 и подпись внутри поля. Кнопка показа при этом остаётся
 * целью 36px, а ниже 900px вырастает до 44 (ADR-183).
 */
export const InPanel: Story = {
  name: 'В панели',
  render: (args) => (
    <div
      data-ui="panel"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-soft)' }}
    >
      <PasswordInput {...args} label="Текущий пароль" defaultValue="Пароль-владельца-2026" />
      <PasswordInput
        {...args}
        label="Новый пароль"
        autoComplete="new-password"
        hint="Не меньше 12 знаков"
      />
      <PasswordInput
        {...args}
        label="Повторите пароль"
        autoComplete="new-password"
        defaultValue="12345"
        error="Пароли не совпадают"
      />
      <PasswordInput {...args} label="Отключено" disabled defaultValue="Пароль-владельца-2026" />
    </div>
  ),
};

/** Показ гаснет сам, когда фокус уходит со всей группы. */
export const HidesOnLeave: Story = {
  name: 'Гаснет при уходе фокуса',
  args: { defaultValue: 'Пароль-владельца-2026' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
      <PasswordInput {...args} />
      <button type="button">Соседняя кнопка</button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Показать пароль' }));
    await expect(canvas.getByLabelText('Пароль')).toHaveAttribute('type', 'text');

    await userEvent.click(canvas.getByRole('button', { name: 'Соседняя кнопка' }));
    await expect(canvas.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
  },
};
