import { describe, expect, it } from 'vitest';

import { articleInputSchema, articlePatchSchema } from './model';

const VALID = {
  title: 'Как выбрать кондиционер',
  category: 'Выбор',
  date: '2026-05-12',
  minutes: 7,
  excerpt: 'Коротко о том, на что смотреть при выборе сплит-системы для квартиры.',
  body: 'Первый абзац статьи, который заведомо длиннее двадцати символов.',
};

describe('тело статьи', () => {
  it('дата публикации — календарный день по времени Тулы', () => {
    expect(articleInputSchema.parse(VALID).date.toISOString()).toBe('2026-05-11T21:00:00.000Z');
  });

  it('без даты статья не сохраняется', () => {
    const result = articleInputSchema.safeParse({ ...VALID, date: null });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).not.toMatch(/[A-Za-z]/);
  });

  it('слишком короткий текст и анонс отклоняются по-русски', () => {
    const short = articleInputSchema.safeParse({ ...VALID, body: 'мало' });

    expect(short.success).toBe(false);
    expect(short.error?.issues[0]?.message).not.toMatch(/[A-Za-z]/);
    expect(articleInputSchema.safeParse({ ...VALID, excerpt: 'мало' }).success).toBe(false);
  });

  it('обложка задаётся отдельной ручкой, а не полем формы', () => {
    expect(articleInputSchema.safeParse({ ...VALID, cover: '/api/media/x.jpg' }).success).toBe(
      false,
    );
  });

  it('PATCH правит часть статьи', () => {
    const parsed = articlePatchSchema.parse({ published: true });

    expect(parsed).toEqual({ published: true });
  });
});
