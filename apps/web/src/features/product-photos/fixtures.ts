/** Данные для историй и тестов блока фотографий. */
import type { PhotoApi, PhotoItem } from './model';

export const photosFixture: readonly PhotoItem[] = [
  { id: 'a', url: '/media/demo-1.jpg', alt: 'Внутренний блок на стене', isMain: true, sort: 0 },
  { id: 'b', url: '/media/demo-2.jpg', alt: null, isMain: false, sort: 1 },
];

/** Набор запросов, который всё принимает: истории смотрят глазами. */
export const acceptingApi: PhotoApi = {
  upload: async () => ({
    ok: true,
    photo: { id: 'c', url: '/media/demo-3.jpg', alt: null, isMain: false, sort: 2 },
  }),
  patch: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
};

export const failingApi: PhotoApi = {
  upload: async () => ({ ok: false, message: 'Фото больше 5 МБ. Уменьшите снимок' }),
  patch: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
};
