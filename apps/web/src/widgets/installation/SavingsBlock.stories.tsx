import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SavingsBlock } from './SavingsBlock';

/**
 * Оценка экономии инвертора. 🔴 Блок обещает деньги, поэтому во всех историях
 * на месте метка «оценка», знак «≈» у каждой суммы и оговорка под расчётом:
 * убрать их — значит соврать в цифрах.
 */
const meta = {
  title: 'Блоки/Монтаж — экономия',
  component: SavingsBlock,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SavingsBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Стартовые значения',
  args: { articleHref: '#invertor-ili-onoff' },
};

export const WithoutArticle: Story = {
  name: 'Без ссылки на разбор',
  args: {},
};

export const CheapTariff: Story = {
  name: 'Низкий тариф',
  args: { articleHref: '#invertor-ili-onoff', defaultTariff: 4 },
};

export const ExpensiveTariff: Story = {
  name: 'Высокий тариф',
  args: { articleHref: '#invertor-ili-onoff', defaultTariff: 9 },
};

export const Narrow: Story = {
  name: 'Телефон 320px',
  args: { articleHref: '#invertor-ili-onoff' },
  globals: { viewport: { value: 'xs' } },
};
