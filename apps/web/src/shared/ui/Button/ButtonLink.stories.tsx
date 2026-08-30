import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ButtonLink } from './ButtonLink';

const meta = {
  title: 'UI Kit/ButtonLink',
  component: ButtonLink,
  args: { href: '#lead', children: 'Оставить заявку' },
} satisfies Meta<typeof ButtonLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <ButtonLink {...args} variant="solid" />
      <ButtonLink {...args} variant="bordered">
        Смотреть цены
      </ButtonLink>
      <ButtonLink {...args} variant="light">
        База знаний
      </ButtonLink>
    </div>
  ),
};

export const Phone: Story = {
  name: 'Телефон в шапке',
  args: { href: 'tel:+70000000000', variant: 'bordered', size: 'sm', children: 'Позвонить' },
};

export const FullWidth: Story = { name: 'Во всю ширину', args: { fullWidth: true } };
