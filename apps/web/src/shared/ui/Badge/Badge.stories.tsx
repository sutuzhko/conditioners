import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from './Badge';

const meta = {
  title: 'UI Kit/Badge',
  component: Badge,
  args: { children: 'Инвертор' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['neutral', 'accent', 'dark', 'sale', 'success', 'warning'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <Badge {...args} variant="neutral">
        Нейтральная
      </Badge>
      <Badge {...args} variant="accent">
        Акцентная
      </Badge>
      <Badge {...args} variant="dark">
        Класс 09
      </Badge>
      <Badge {...args} variant="success">
        Опубликован
      </Badge>
      <Badge {...args} variant="warning">
        На модерации
      </Badge>
      <Badge {...args} variant="sale">
        −12%
      </Badge>
    </div>
  ),
};

export const Sale: Story = {
  name: 'Плашка скидки',
  args: { variant: 'sale', children: '−12%' },
};

export const Mono: Story = {
  name: 'Техническая метка',
  args: { mono: true, variant: 'accent', children: 'Схема 1' },
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Badge {...args} size="sm" variant="accent">
        Мелкая
      </Badge>
      <Badge {...args} size="md" variant="accent">
        Средняя
      </Badge>
    </div>
  ),
};

export const LongLabel: Story = {
  name: 'Длинная подпись',
  args: { variant: 'accent', children: 'Гарантия на монтаж до трёх лет' },
};
