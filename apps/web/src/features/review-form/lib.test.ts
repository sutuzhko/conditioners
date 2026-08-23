import { afterEach, describe, expect, it, vi } from 'vitest';

import { reviewFormContent as texts } from './content';
import {
  REVIEW_ENDPOINT,
  buildReviewFormData,
  emptyReviewValues,
  postReview,
  validateReviewValues,
} from './lib';

const filled = {
  ...emptyReviewValues(),
  name: 'Ирина',
  rating: 5,
  text: 'Поставили сплит в спальню, трассу спрятали в короб. Смета совпала.',
  consent: true,
};

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('validateReviewValues', () => {
  it('пропускает заполненную форму', () => {
    expect(validateReviewValues(filled)).toBeNull();
  });

  it('сообщения об ошибках написаны по-русски', () => {
    const errors = validateReviewValues(emptyReviewValues());

    expect(errors).not.toBeNull();
    for (const message of Object.values(errors ?? {})) {
      expect(message).not.toMatch(/[A-Za-z]/);
    }
  });

  it('🔴 требует оценки: без звёзд отзыв не отзыв, а реплика', () => {
    expect(validateReviewValues({ ...filled, rating: 0 })?.rating).toMatch(/оценку/i);
  });

  it('🔴 требует согласия на обработку данных', () => {
    expect(validateReviewValues({ ...filled, consent: false })?.consent).toMatch(/согласия/i);
  });

  it('коротких отзывов не пропускает — их оставляют спам-боты', () => {
    expect(validateReviewValues({ ...filled, text: 'Норм' })?.text).toMatch(/подробнее/i);
  });
});

describe('buildReviewFormData', () => {
  it('шлёт оценку строкой, а незаполненное фото не шлёт вовсе', () => {
    const data = buildReviewFormData({ ...filled }, null, '');

    expect(data.get('name')).toBe('Ирина');
    expect(data.get('rating')).toBe('5');
    expect(data.has('photo')).toBe(false);
    expect(data.get('consent')).toBe('true');
    expect(data.get('hp')).toBe('');
  });
});

describe('postReview', () => {
  it('шлёт форму на контрактный адрес и возвращает идентификатор отзыва', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(respond(201, { id: 'rev-7' })));
    vi.stubGlobal('fetch', fetchMock);

    const result = await postReview(buildReviewFormData(filled, null, ''));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(REVIEW_ENDPOINT);
    expect(call?.[1]).toMatchObject({ method: 'POST' });
    // тело — FormData: заголовок multipart с границей частей проставляет браузер
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
    expect(result).toEqual({ ok: true, id: 'rev-7' });
  });

  it('показывает текст из конверта ошибки', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respond(400, {
            error: { code: 'validation_error', message: 'Поставьте оценку', field: 'rating' },
          }),
        ),
      ),
    );

    await expect(postReview(new FormData())).resolves.toEqual({
      ok: false,
      message: 'Поставьте оценку',
      field: 'rating',
    });
  });

  it('на ответ без понятного текста подставляет объяснение по коду', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 413 }))),
    );

    await expect(postReview(new FormData())).resolves.toEqual({
      ok: false,
      message: texts.errorTooLarge,
    });
  });

  it('обрыв связи — это результат, а не исключение', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );

    await expect(postReview(new FormData())).resolves.toEqual({
      ok: false,
      message: texts.errorNetwork,
    });
  });
});
