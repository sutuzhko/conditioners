import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { crmContent as texts } from './content';
import { GridScroll } from './GridScroll';

/** Двадцать четыре часа подписями — то же, что рисует полоса часов сетки. */
const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);

const meta = {
  title: 'Админка/Календарь/Прокрутка сетки',
  component: GridScroll,
  parameters: { layout: 'padded' },
  args: {
    workFromMin: 9 * 60,
    label: texts.hours,
    children: (
      <div>
        {hours.map((hour) => (
          <div key={hour} style={{ height: '48px', borderTop: '1px solid currentcolor' }}>
            {hour}
          </div>
        ))}
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxHeight: '320px', overflow: 'hidden' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GridScroll>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 🔴 Открывается рабочая часть суток, ночь доступна прокруткой (ADR-128). */
export const РабочееОкно: Story = {};

/** Ранняя смена: сетка открывается на шести утра, а не на девяти. */
export const РанняяСмена: Story = {
  args: { workFromMin: 6 * 60 },
};

/** Круглосуточная работа: смотреть начинают с полуночи. */
export const СПолуночи: Story = {
  args: { workFromMin: 0 },
};
