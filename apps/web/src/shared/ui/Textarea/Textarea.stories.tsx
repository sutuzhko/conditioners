import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Textarea } from './Textarea';

const meta = {
  title: 'UI Kit/Textarea',
  component: Textarea,
  args: { label: 'Комментарий', placeholder: 'Площадь помещения, пожелания по модели…' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Required: Story = { name: 'Обязательное', args: { label: 'Отзыв', required: true } };

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Чем подробнее опишете объект, тем точнее смета' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: { error: 'Расскажите чуть подробнее — не меньше 30 символов', defaultValue: 'Норм' },
};

export const Filled: Story = {
  name: 'Заполнено',
  args: { defaultValue: 'Двушка 54 м², третий этаж, нужен монтаж на кронштейнах.' },
};

export const Disabled: Story = { name: 'Отключено', args: { disabled: true } };

export const Typing: Story = {
  name: 'Ввод с клавиатуры',
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByLabelText('Комментарий');
    await userEvent.type(field, 'Офис 30 м²');
    await expect(field).toHaveValue('Офис 30 м²');
  },
};

export const Empty: Story = { name: 'Без подписи', args: { label: undefined } };
