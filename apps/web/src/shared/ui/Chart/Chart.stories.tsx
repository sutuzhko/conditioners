import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Chart } from './Chart';

/** Числа выдуманы для витрины кита: настоящие приходят из БД (инвариант 8). */
const ORDERS = { id: 'orders', name: 'Заказы', points: [12, 18, 15, 24, 21, 27] };
const PAYOUTS = { id: 'payouts', name: 'Выплаты монтажникам', points: [8, 11, 9, 16, 14, 18] };
const WEEKS = ['30 нед', '31 нед', '32 нед', '33 нед', '34 нед', '35 нед'];

const meta = {
  title: 'UI Kit/Chart',
  component: Chart,
  args: { series: [ORDERS], labels: WEEKS, title: 'Заказы по неделям' },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            background: 'var(--card)',
            padding: 16,
          }}
        >
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Одна серия' };

/**
 * 🔴 Две серии. Вторая различается штрихом, а не только цветом: пара разведена
 * по тону, но не по светлоте — 1,36:1 в светлой теме и 1,08:1 в тёмной.
 * Легенда при двух сериях присутствует всегда.
 */
export const TwoSeries: Story = {
  name: 'Две серии',
  args: {
    series: [ORDERS, PAYOUTS],
    title: 'Заказы и выплаты по неделям',
    format: (value: number) => `${value} шт`,
  },
};

/** Тот же график в оттенках серого — как он выглядит на чёрно-белой печати
    наряда. Линии обязаны различаться и здесь: цвета тут нет вовсе. */
export const Grayscale: Story = {
  name: 'Чёрно-белая печать',
  args: { series: [ORDERS, PAYOUTS], title: 'Заказы и выплаты' },
  decorators: [
    (Story) => (
      <div
        data-ui="panel"
        style={{ background: 'var(--bg-soft)', padding: 16, filter: 'grayscale(1)' }}
      >
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            background: 'var(--card)',
            padding: 16,
          }}
        >
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Money: Story = {
  name: 'Деньги',
  args: {
    series: [{ id: 'revenue', name: 'Выручка', points: [128400, 156200, 141800, 189300] }],
    labels: ['Май', 'Июнь', 'Июль', 'Август'],
    title: 'Выручка по месяцам',
    format: (value: number) => `${Math.round(value / 1000)} т₽`,
  },
};

/** Плоский ряд: шкала не схлопывается, линия идёт посередине. */
export const Flat: Story = {
  name: 'Ряд без изменений',
  args: {
    series: [{ id: 'flat', name: 'Заказы', points: [12, 12, 12, 12] }],
    labels: ['32 нед', '33 нед', '34 нед', '35 нед'],
  },
};

/** Одна точка: данных на одну неделю — это не линия. */
export const SinglePoint: Story = {
  name: 'Одна точка',
  args: {
    series: [{ id: 'one', name: 'Заказы', points: [12] }],
    labels: ['35 нед'],
  },
};

/** Пусто: график остаётся на месте, чтобы карточка не меняла высоту. */
export const Empty: Story = {
  name: 'Пусто',
  args: {
    series: [{ id: 'empty', name: 'Заказы', points: [] }],
    labels: [],
    title: 'Заказов за период не было',
  },
};

/** Узкая карточка: график тянется по ширине и за её край не выходит. */
export const Narrow: Story = {
  name: 'В узкой карточке',
  args: { series: [ORDERS, PAYOUTS], title: 'Заказы и выплаты' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16, maxWidth: 320 }}>
        <div
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            background: 'var(--card)',
            padding: 12,
            overflow: 'hidden',
          }}
        >
          <Story />
        </div>
      </div>
    ),
  ],
};
