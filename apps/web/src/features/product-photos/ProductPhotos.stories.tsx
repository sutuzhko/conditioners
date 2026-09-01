import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProductPhotos } from './ProductPhotos';
import { acceptingApi, failingApi, photosFixture } from './fixtures';

const meta = {
  title: 'Админка/Фотографии модели',
  component: ProductPhotos,
  // Допущение инвариантов — причина в reason (ADR-230)
  parameters: {
    invariants: {
      allow: [
        {
          rule: 'images',
          reason:
            'фото из тома загрузок сервера (/media, /api/media): в статической витрине его нет (ADR-207)',
        },
      ],
    },
  },
  args: { photos: photosFixture, api: acceptingApi },
} satisfies Meta<typeof ProductPhotos>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Фотографий нет — на карточке будет заглушка. */
export const Пусто: Story = {
  args: { photos: [] },
};

export const ОтказСервера: Story = {
  args: { api: failingApi, confirmRemove: async () => true },
};
