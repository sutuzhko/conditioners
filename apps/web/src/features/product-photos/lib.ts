/** Запросы к фотографиям модели — контракт docs/API.md §3. */
import { z } from 'zod';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';
import { adminRequest, jsonInit } from '@/shared/lib/api';

import { productPhotosContent as texts } from './content';
import type { PhotoActionResult, PhotoApi, PhotoUploadResult } from './model';

/* Общий разбор ответа (ADR-030): свои остаются только формулировки фичи,
   текст про истёкшую сессию — один на всю панель. */
const PHOTO_TEXTS = {
  ...ADMIN_API_TEXTS,
  network: texts.networkError,
  server: texts.serverError,
};

/**
 * Ответ загрузки: сервер возвращает готовую запись фотографии. Ответ приходит
 * снаружи, поэтому разбирается схемой, а не приведением типа; по форме она
 * совпадает с `PhotoItem`.
 */
const photoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  alt: z.string().nullable(),
  isMain: z.boolean(),
  sort: z.number(),
});

/** Набор запросов для одной модели: id не тащится в каждый вызов компонента. */
export function photoApi(productId: string): PhotoApi {
  const base = `/api/admin/models/${productId}/photos`;

  return {
    async upload(file: File): Promise<PhotoUploadResult> {
      /* multipart, а не JSON: сервер ждёт поле `photo` формой и сам проверяет
         настоящий тип файла, а не расширение. */
      const form = new FormData();
      form.append('photo', file);

      const result = await adminRequest(base, { method: 'POST', body: form }, PHOTO_TEXTS);
      if (!result.ok) return { ok: false, message: result.message };

      const photo = photoSchema.safeParse(result.payload);
      return photo.success
        ? { ok: true, photo: photo.data }
        : { ok: false, message: texts.serverError };
    },

    async patch(
      photoId: string,
      patch: { alt?: string | null; isMain?: boolean },
    ): Promise<PhotoActionResult> {
      const result = await adminRequest(
        `${base}/${photoId}`,
        jsonInit('PATCH', patch),
        PHOTO_TEXTS,
      );
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },

    async remove(photoId: string): Promise<PhotoActionResult> {
      const result = await adminRequest(`${base}/${photoId}`, { method: 'DELETE' }, PHOTO_TEXTS);
      return result.ok ? { ok: true } : { ok: false, message: result.message };
    },
  };
}
