import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PageSize } from './PageSize';

const options = [8, 20, 50].map((step) => ({
  value: String(step),
  label: String(step),
  href: step === 20 ? '/admin/stock' : `/admin/stock?size=${step}`,
}));

const meta = {
  title: 'UI Kit/PageSize',
  component: PageSize,
  args: { title: 'Строк на странице', value: '20', options },
  /* 🔴 Ступень шага стоит только в подвале списка панели, и геометрия у неё
     панельная: без обёртки история показала бы поле формы высотой 48. */
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--card)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageSize>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

/** Мелкий шаг: значение в поле — то, что стоит в адресе. */
export const Small: Story = { name: 'Мелкий шаг', args: { value: '8' } };

/** Крупный шаг: двузначное и трёхзначное значение не меняют ширину поля. */
export const Large: Story = { name: 'Крупный шаг', args: { value: '50' } };

/** Фокус с клавиатуры: кольцо обязано быть видно на одной цели, а не на трёх. */
export const Focus: Story = {
  name: 'Фокус с клавиатуры',
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('combobox', { name: 'Строк на странице' });
    await userEvent.click(field);
    await expect(field).toHaveFocus();
  },
};

/** Подвал целиком: счёт, разбивка и ступень шага в одном ряду. */
export const InFooter: Story = {
  name: 'В подвале списка',
  render: (args) => (
    <div
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--line-soft)',
        padding: '12px 16px',
      }}
    >
      <span style={{ color: 'var(--faint)', fontSize: 'var(--fs-caption)' }}>
        Показано 20 из 137 позиций
      </span>
      <PageSize {...args} />
    </div>
  ),
};
