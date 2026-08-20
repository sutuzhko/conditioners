import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatList } from './Stat';

const meta = {
  title: 'UI Kit/Stat',
  component: StatList,
  args: {
    items: [
      { value: 1200, suffix: '+', label: 'установок в Туле' },
      { value: 3, suffix: ' года', label: 'гарантия на монтаж' },
      { value: 1, suffix: ' день', label: 'от заявки до монтажа' },
    ],
    tone: 'default',
  },
  argTypes: { tone: { control: 'inline-radio', options: ['default', 'onPanel'] } },
} satisfies Meta<typeof StatList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Базовое состояние',
  render: (args) => <StatList {...args} />,
};

export const OnPanel: Story = {
  name: 'На тёмной панели',
  args: { tone: 'onPanel', label: 'Наши цифры' },
  render: (args) => (
    <div style={{ background: 'var(--panel)', padding: 28, borderRadius: 20 }}>
      <StatList {...args} />
    </div>
  ),
};

export const Empty: Story = {
  name: 'Пусто — цифр нет',
  args: { items: [] },
  render: (args) => (
    <>
      <StatList {...args} />
      <p style={{ color: 'var(--muted)', margin: 0 }}>
        Достижения не заданы: полосы нет вовсе — выдуманный счётчик запрещён.
      </p>
    </>
  ),
};
