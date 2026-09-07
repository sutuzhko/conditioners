import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ProductPhotos } from './ProductPhotos';
import { acceptingApi, failingApi, photosFixture, photosGoneFixture } from './fixtures';

const meta = {
  title: 'Админка/Фотографии модели',
  component: ProductPhotos,
  args: { photos: photosFixture, api: acceptingApi },
} satisfies Meta<typeof ProductPhotos>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Фотографий нет — на карточке будет заглушка. */
export const Пусто: Story = {
  args: { photos: [] },
};

/**
 * 🔴 Ссылка есть, файла нет (issue #690): рамка со словами вместо значка
 * сломанной картинки. `<img>` в разметке при этом не появляется вовсе — есть
 * ли файл, знает сервер, и разметка приходит уже верной.
 */
export const ФайлПропал: Story = {
  args: { photos: photosGoneFixture },
};

export const ОтказСервера: Story = {
  args: { api: failingApi, confirmRemove: async () => true },
};
