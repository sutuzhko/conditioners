import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { IconButton } from './IconButton';

const burger = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

/** Крестик удаления — тот же значок, что стоит в строке прайса. */
const cross = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14.5 9.5 9.5 14.5M9.5 9.5l5 5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const meta = {
  title: 'UI Kit/IconButton',
  component: IconButton,
  args: { label: 'Открыть меню', icon: burger },
  argTypes: {
    variant: { control: 'inline-radio', options: ['solid', 'outline', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconButton {...args} variant="solid" />
      <IconButton {...args} variant="outline" />
      <IconButton {...args} variant="ghost" />
      <IconButton {...args} variant="danger" label="Удалить строку 2" icon={cross} />
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconButton {...args} variant="outline" size="sm" />
      <IconButton {...args} variant="outline" size="md" />
      <IconButton {...args} variant="outline" size="lg" />
    </div>
  ),
};

export const Hover: Story = {
  name: 'Наведение',
  args: { variant: 'outline' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.hover(button);
    await expect(button).toBeEnabled();
  },
};

export const Disabled: Story = { name: 'Отключена', args: { disabled: true, variant: 'outline' } };

/**
 * 🔴 Удаление строки — красное (issue #35). Тоном, а не заливкой: в ряду
 * строк прайса красная плитка спорит с цифрами, ради которых на ряд смотрят.
 * Заливка приходит на наведение — см. историю «Наведение опасной».
 */
export const Danger: Story = {
  name: 'Опасная',
  args: { variant: 'danger', label: 'Удалить строку 2', icon: cross },
};

export const DangerHover: Story = {
  name: 'Наведение опасной',
  args: { variant: 'danger', label: 'Удалить строку 2', icon: cross },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.hover(button);
    await expect(button).toBeEnabled();
  },
};

export const DangerDisabled: Story = {
  name: 'Опасная отключена',
  args: { variant: 'danger', label: 'Удалить строку 2', icon: cross, disabled: true },
};
