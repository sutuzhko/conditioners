import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { achievements, warranty, warrantyEmpty, warrantyPartial } from './fixtures';
import { WhyUs } from './WhyUs';

/**
 * «Почему в Туле выбирают нас». Цифры и сроки гарантии приходят пропсами:
 * блок не ходит в базу, поэтому в Storybook рисуется целиком.
 */
const meta = {
  title: 'Блоки/Почему нас выбирают',
  component: WhyUs,
  parameters: { layout: 'fullscreen' },
  args: { achievements, warranty },
} satisfies Meta<typeof WhyUs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'С цифрами и гарантией' };

/** 🔴 Основное состояние проекта: настройки пусты, цифр нет и рисовать нечего. */
export const WithoutNumbers: Story = {
  name: 'Без цифр (основное состояние)',
  args: { achievements: [], warranty: warrantyEmpty },
};

export const WithoutWarranty: Story = {
  name: 'Цифры есть, гарантия не заполнена',
  args: { warranty: warrantyEmpty },
};

export const WarrantyOnly: Story = {
  name: 'Гарантия без цифр',
  args: { achievements: [], warranty },
};

export const PartialWarranty: Story = {
  name: 'Заполнена только гарантия на монтаж',
  args: { warranty: warrantyPartial },
};
