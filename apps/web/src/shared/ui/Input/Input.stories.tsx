import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Input } from './Input';

const meta = {
  title: 'UI Kit/Input',
  component: Input,
  args: { label: 'Как к вам обращаться', placeholder: 'Имя' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Required: Story = { name: 'Обязательное', args: { required: true } };

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Позвоним в течение 15 минут в рабочее время' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: {
    label: 'Телефон',
    type: 'tel',
    defaultValue: '+7 999',
    error: 'Введите номер полностью — 10 цифр после +7',
  },
};

export const Filled: Story = { name: 'Заполнено', args: { defaultValue: 'Пётр' } };

export const Disabled: Story = {
  name: 'Отключено',
  args: { disabled: true, defaultValue: 'Пётр' },
};

export const ReadOnly: Story = {
  name: 'Только чтение',
  args: { readOnly: true, defaultValue: '+7 (900) 000-00-00' },
};

export const Focus: Story = {
  name: 'Фокус с клавиатуры',
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText(/Как к вам обращаться/);
    await userEvent.click(input);
    await expect(input).toHaveFocus();
  },
};

export const Empty: Story = { name: 'Без подписи', args: { label: undefined } };
