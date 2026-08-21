import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'UI Kit/Button',
  component: Button,
  args: { children: 'Рассчитать стоимость' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'accent', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button {...args} variant="primary">
        Основная
      </Button>
      <Button {...args} variant="secondary">
        Вторичная
      </Button>
      <Button {...args} variant="accent">
        Акцентная
      </Button>
      <Button {...args} variant="ghost">
        Призрачная
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  name: 'Размеры',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <Button {...args} size="sm">
        Мелкая
      </Button>
      <Button {...args} size="md">
        Средняя
      </Button>
      <Button {...args} size="lg">
        Крупная
      </Button>
    </div>
  ),
};

export const Hover: Story = {
  name: 'Наведение',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await userEvent.hover(button);
    await expect(button).toBeEnabled();
  },
};

export const Disabled: Story = { name: 'Отключена', args: { disabled: true } };

export const Loading: Story = { name: 'Загрузка', args: { loading: true } };

export const WithIcon: Story = {
  name: 'С иконкой',
  args: {
    iconStart: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
};

export const FullWidth: Story = {
  name: 'Во всю ширину',
  args: { fullWidth: true },
};

export const EmptyLabel: Story = {
  name: 'Пустая подпись',
  args: { children: '' },
};

/** Кнопка «Заказать» в карточке каталога: заливка --accent-bg, текст --on-accent. */
export const Accent: Story = {
  name: 'Акцентная',
  args: { variant: 'accent', children: 'Заказать' },
};
