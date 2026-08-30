import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeSwitch } from './ThemeSwitch';

const meta = {
  title: 'UI Kit/ThemeSwitch',
  component: ThemeSwitch,
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const CustomLabel: Story = { name: 'Своё имя группы', args: { label: 'Оформление' } };

/** Так пилюля стоит в подвале выдвижного меню: часы слева, переключатель справа. */
export const InDrawerFooter: Story = {
  name: 'В подвале шторки',
  render: (args) => (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 288,
        padding: '14px 16px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        background: 'var(--bg-soft)',
      }}
    >
      <span
        style={{
          overflow: 'hidden',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-caption)',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        Пн–Вс, 8:00–21:00
      </span>
      <ThemeSwitch {...args} />
    </div>
  ),
};

export const Switching: Story = {
  name: 'Переключение',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const before = document.documentElement.getAttribute('data-theme');

    await userEvent.click(canvas.getByRole('radio', { name: 'Тёмная' }));
    await expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await waitFor(() => expect(canvas.getByRole('radio', { name: 'Тёмная' })).toBeChecked());

    // возвращаем как было, чтобы история не ломала соседние
    if (before !== 'dark') await userEvent.click(canvas.getByRole('radio', { name: 'Светлая' }));
  },
};
