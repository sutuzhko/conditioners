import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderPhotos } from './OrderPhotos';
import { acceptingWorkApi, failingWorkApi, photos } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Фотографии',
  component: OrderPhotos,
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
  args: {
    api: acceptingWorkApi,
    photos,
    confirmRemove: async () => true,
  },
} satisfies Meta<typeof OrderPhotos>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Владелец: грузит место установки, видит и убирает оба этапа. */
export const Базовое: Story = {};

export const Пусто: Story = {
  args: { photos: [] },
};

/**
 * 🔴 Монтажник: место установки только смотрит, выполненные работы грузит.
 * Кнопки загрузки на «до» у него нет — а этап всё равно проверяет сервер.
 */
export const ГлазамиМонтажника: Story = {
  args: { forInstaller: true },
};

export const Ошибка: Story = {
  args: { api: failingWorkApi },
};
