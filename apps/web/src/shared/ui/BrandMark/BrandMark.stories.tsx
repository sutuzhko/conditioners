import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BrandMark } from './BrandMark';

const meta = {
  title: 'UI Kit/BrandMark',
  component: BrandMark,
  args: { size: 38, tone: 'auto' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['auto', 'onDark'] },
    size: { control: { type: 'number', min: 16, max: 96 } },
  },
} satisfies Meta<typeof BrandMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Sizes: Story = {
  name: 'Размеры и компенсация штриха',
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
      {[16, 24, 38, 48, 72].map((size) => (
        <BrandMark {...args} key={size} size={size} />
      ))}
    </div>
  ),
};

export const OnDark: Story = {
  name: 'На тёмной панели',
  args: { tone: 'onDark' },
  render: (args) => (
    <div style={{ background: 'var(--panel)', padding: 24, borderRadius: 16 }}>
      <BrandMark {...args} />
    </div>
  ),
};
