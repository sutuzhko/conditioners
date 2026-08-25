import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeToggle } from './ThemeToggle';

const meta = {
  title: 'UI Kit/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Outline: Story = { name: 'В рамке', args: { variant: 'outline' } };

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <ThemeToggle {...args} variant="outline" size="sm" />
      <ThemeToggle {...args} variant="outline" size="md" />
      <ThemeToggle {...args} variant="outline" size="lg" />
    </div>
  ),
};

export const CustomLabel: Story = {
  name: 'Своя подпись',
  args: { label: 'Светлая или тёмная тема' },
};

export const Switching: Story = {
  name: 'Переключение',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    const before = document.documentElement.getAttribute('data-theme');

    await userEvent.click(button);
    await expect(document.documentElement.getAttribute('data-theme')).not.toBe(before);
    // кнопка сообщает состояние: «нажата» = тёмная тема включена
    await waitFor(() =>
      expect(button).toHaveAttribute(
        'aria-pressed',
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'true' : 'false',
      ),
    );

    // возвращаем как было, чтобы история не ломала соседние
    await userEvent.click(button);
  },
};
