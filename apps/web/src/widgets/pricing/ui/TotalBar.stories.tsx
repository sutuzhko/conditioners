import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { leadHref } from '@/shared/config/lead';

import { TotalBar } from './TotalBar';

/**
 * Полоса итога калькулятора во всех трёх состояниях.
 *
 * 🔴 Истории стоят рядом не для красоты: высота полосы и координата верха
 * кнопки обязаны совпадать во всех трёх, иначе при каждом пересчёте кнопка
 * прыгает вместе со всем, что ниже. Проверяется это замером в браузере, а
 * снимок историй фиксирует уже проверенное.
 */
const meta = {
  title: 'Блоки/Цены — полоса итога',
  component: TotalBar,
  args: { href: leadHref({ topic: 'install' }) },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof TotalBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  name: 'Сумма',
  args: { state: 'ready', amount: 18_400 },
  /* 🔴 Верх кнопки «Оставить заявку» обязан стоять на месте во всех
     состояниях полосы (ADR-212): разброс 22px ловили замером руками, теперь
     его меряет раннер инвариантов — правило `stability`, #465. Опорная —
     сумма; состояния — пересчёт, выезд и длинная сумма. */
  parameters: {
    invariants: {
      stability: {
        /* Единственная ссылка полосы — кнопка «Оставить заявку». По `href`
           её не ловить: адрес приходит объектом, и как его сериализует mock
           `next/link` в витрине, селектору знать незачем. */
        control: '#storybook-root a',
        states: [
          'блоки-цены-полоса-итога--pending',
          'блоки-цены-полоса-итога--on-site',
          'блоки-цены-полоса-итога--long-amount',
        ],
      },
    },
  },
};

export const Pending: Story = {
  name: 'Пересчёт',
  args: { state: 'pending' },
};

export const OnSite: Story = {
  name: 'Считаем по телефону',
  args: { state: 'onsite' },
};

export const LongAmount: Story = {
  name: 'Длинная сумма: четыре блока с высотными работами',
  args: { state: 'ready', amount: 124_800 },
};
