import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ButtonLink } from './ButtonLink';

const meta = {
  title: 'UI Kit/ButtonLink',
  component: ButtonLink,
  args: { href: '#zayavka', children: 'Оставить заявку' },
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <ButtonLink {...args} variant="primary" />
      <ButtonLink {...args} variant="secondary">
        Смотреть цены
      </ButtonLink>
      <ButtonLink {...args} variant="ghost">
        База знаний
      </ButtonLink>
    </div>
  ),
};

export const Phone: Story = {
  name: 'Телефон в шапке',
  args: { href: 'tel:+70000000000', variant: 'secondary', size: 'sm', children: 'Позвонить' },
};

export const FullWidth: Story = { name: 'Во всю ширину', args: { fullWidth: true } };
