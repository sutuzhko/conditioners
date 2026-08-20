import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Checkbox } from './Checkbox';

const consent = (
  <>
    Согласен на обработку персональных данных и принимаю{' '}
    <a href="/politika-konfidencialnosti">политику конфиденциальности</a>
  </>
);

const meta = {
  title: 'UI Kit/Checkbox',
  component: Checkbox,
  args: { label: 'Нужна штроба под магистраль' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Checked: Story = { name: 'Отмечен', args: { defaultChecked: true } };

export const Consent: Story = {
  name: 'Согласие со ссылкой',
  args: { label: consent, required: true },
};

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Штроба нужна, если магистраль прячут в стену' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: { label: consent, required: true, error: 'Без согласия мы не можем принять заявку' },
};

export const Disabled: Story = { name: 'Отключён', args: { disabled: true } };

export const DisabledChecked: Story = {
  name: 'Отключён и отмечен',
  args: { disabled: true, defaultChecked: true },
};

export const Toggling: Story = {
  name: 'Переключение с клавиатуры',
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox');
    await userEvent.click(box);
    await expect(box).toBeChecked();
  },
};
