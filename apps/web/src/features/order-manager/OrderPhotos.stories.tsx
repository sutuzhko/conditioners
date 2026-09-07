import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderPhotos } from './OrderPhotos';
import { acceptingWorkApi, failingWorkApi, showcasePhotos, showcasePhotosGone } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Фотографии',
  component: OrderPhotos,
  args: {
    api: acceptingWorkApi,
    /* Кадр внутри адреса, а не ссылка на закрытый маршрут панели: в статической
       витрине отдавать снимок некому (issue #676). */
    photos: showcasePhotos,
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

/**
 * 🔴 Ссылка есть, файла нет (issue #690): рамка со словами вместо значка
 * сломанной картинки, `<img>` в разметке не появляется вовсе. Удаление рядом
 * остаётся — снять запись, у которой нет файла, как раз и нужно.
 */
export const ФайлПропал: Story = {
  args: { photos: showcasePhotosGone },
};

export const Ошибка: Story = {
  args: { api: failingWorkApi },
};
