import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Card } from './Card';

const meta = {
  title: 'UI Kit/Card',
  component: Card,
  args: {
    children: (
      <>
        <h3 style={{ margin: '0 0 8px', fontSize: 'var(--fs-h3)', color: 'var(--ink)' }}>
          Монтаж под ключ
        </h3>
        <p style={{ margin: 0 }}>Вакуумация магистрали, опрессовка, вывод конденсата.</p>
      </>
    ),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'soft', 'accent', 'panel'] },
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}
    >
      <Card {...args} variant="default" />
      <Card {...args} variant="soft" />
      <Card {...args} variant="accent" />
      <Card {...args} variant="panel" />
    </div>
  ),
};

export const Interactive: Story = {
  name: 'Интерактивная',
  args: { interactive: true },
};

export const Hover: Story = {
  name: 'Наведение',
  args: { interactive: true },
  render: (args) => <Card {...args} data-testid="card" />,
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByTestId('card');
    await userEvent.hover(card);
    await expect(card).toBeVisible();
  },
};

export const Paddings: Story = {
  name: 'Внутренние отступы',
  render: (args) => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card {...args} padding="sm" />
      <Card {...args} padding="md" />
      <Card {...args} padding="lg" />
    </div>
  ),
};

export const AsArticle: Story = {
  name: 'Семантика article',
  args: { as: 'article', interactive: true },
};

export const Empty: Story = {
  name: 'Пустая',
  args: {
    padding: 'lg',
    children: <p style={{ margin: 0, color: 'var(--muted)' }}>Пока нет ни одной модели</p>,
  },
};
