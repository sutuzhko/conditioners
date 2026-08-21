import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SavingsBlock } from './SavingsBlock';

/** Часы подряд: `hoursFrom(12, 20)` — с 12:00 до 20:00. */
function hoursFrom(from: number, to: number): number[] {
  const hours: number[] = [];
  for (let hour = from; hour < to; hour += 1) hours.push(hour % 24);
  return hours;
}

/**
 * Оценка экономии инвертора. 🔴 Блок обещает деньги, поэтому во всех историях
 * на месте метка «оценка», знак «≈» у каждой суммы, названные допущения под
 * управлением и оговорка под расчётом: убрать их — значит соврать в цифрах.
 */
const meta = {
  title: 'Блоки/Монтаж — экономия',
  component: SavingsBlock,
  parameters: { layout: 'fullscreen' },
  args: { articleHref: '#invertor-ili-onoff' },
} satisfies Meta<typeof SavingsBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Типичный день',
  args: { defaultHours: hoursFrom(12, 20) },
};

export const Empty: Story = {
  name: 'Часы не отмечены',
  args: { defaultHours: [] },
};

export const AllDay: Story = {
  name: 'Круглосуточно',
  args: { defaultHours: hoursFrom(0, 24) },
};

export const NightShift: Story = {
  name: 'Ночная смена, тариф день/ночь',
  args: { defaultHours: hoursFrom(21, 31), defaultTariffMode: 'dual' },
};

export const DualTariff: Story = {
  name: 'Тариф день/ночь',
  args: { defaultHours: hoursFrom(12, 20), defaultTariffMode: 'dual' },
};

export const WithoutArticle: Story = {
  name: 'Без ссылки на разбор',
  args: { articleHref: undefined, defaultHours: hoursFrom(12, 20) },
};

export const Narrow: Story = {
  name: 'Телефон 320px',
  args: { defaultHours: hoursFrom(12, 20) },
  globals: { viewport: { value: 'xs' } },
};
