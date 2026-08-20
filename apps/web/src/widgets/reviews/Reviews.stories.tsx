import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Reviews } from './Reviews';
import {
  policyHrefFixture,
  reviewWithPhotoFixture,
  reviewWithoutDistrictFixture,
  reviewsFixture,
} from './fixtures';

/**
 * Блок отзывов вместе с формой — одна секция макета.
 *
 * 🔴 Первой идёт пустая секция: настоящих отзывов у проекта нет, выдуманные
 * публиковать запрещено (инвариант 10, ADR-012), и ближайшие месяцы сайт
 * выглядит именно так. Остальные истории показывают, как блок поведёт себя,
 * когда отзывы появятся.
 */
const meta = {
  title: 'Блоки/Отзывы',
  component: Reviews,
  args: { policyHref: policyHrefFixture },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Reviews>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'Пустая секция — основное состояние',
};

export const WithReviews: Story = {
  name: 'Несколько отзывов',
  args: { reviews: reviewsFixture },
};

export const WithPhoto: Story = {
  name: 'Отзыв с фотографией',
  args: { reviews: [reviewWithPhotoFixture, ...reviewsFixture.slice(0, 2)] },
};

export const WithoutDistrict: Story = {
  name: 'Отзыв без района',
  args: { reviews: [reviewWithoutDistrictFixture] },
};
