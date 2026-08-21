/** Запросы к фотографиям модели — контракт docs/API.md §3. */
import { productPhotosContent as texts } from './content';
import type { PhotoActionResult, PhotoApi, PhotoItem, PhotoUploadResult } from './model';

function readMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return undefined;
  const { message } = error as Record<string, unknown>;
  return typeof message === 'string' ? message : undefined;
}

/** Разбор ответа загрузки: сервер возвращает готовую запись фотографии. */
function toPhoto(payload: unknown): PhotoItem | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { id, url, alt, isMain, sort } = payload as Record<string, unknown>;
  if (typeof id !== 'string' || typeof url !== 'string') return null;

  return {
    id,
    url,
    alt: typeof alt === 'string' ? alt : null,
    isMain: isMain === true,
    sort: typeof sort === 'number' ? sort : 0,
  };
}

/** Набор запросов для одной модели: id не тащится в каждый вызов компонента. */
export function photoApi(productId: string): PhotoApi {
  const base = `/api/admin/models/${productId}/photos`;

  return {
    async upload(file: File): Promise<PhotoUploadResult> {
      /* multipart, а не JSON: сервер ждёт поле `photo` формой и сам проверяет
         настоящий тип файла, а не расширение. */
      const form = new FormData();
      form.append('photo', file);

      let response: Response;
      try {
        response = await fetch(base, { method: 'POST', body: form });
      } catch {
        return { ok: false, message: texts.networkError };
      }

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        return { ok: false, message: readMessage(payload) ?? texts.serverError };
      }

      const photo = toPhoto(payload);
      return photo === null ? { ok: false, message: texts.serverError } : { ok: true, photo };
    },

    async patch(
      photoId: string,
      patch: { alt?: string | null; isMain?: boolean },
    ): Promise<PhotoActionResult> {
      try {
        const response = await fetch(`${base}/${photoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (response.ok) return { ok: true };

        const payload: unknown = await response.json().catch(() => null);
        return { ok: false, message: readMessage(payload) ?? texts.serverError };
      } catch {
        return { ok: false, message: texts.networkError };
      }
    },

    async remove(photoId: string): Promise<PhotoActionResult> {
      try {
        const response = await fetch(`${base}/${photoId}`, { method: 'DELETE' });
        return response.ok ? { ok: true } : { ok: false, message: texts.serverError };
      } catch {
        return { ok: false, message: texts.networkError };
      }
    },
  };
}
