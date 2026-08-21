import { describe, expect, it } from 'vitest';

import { filledArticle } from './fixtures';
import { toRequestBody } from './lib';

describe('Статья — тело запроса', () => {
  it('пустой адрес не отправляется — сервер соберёт его из заголовка', () => {
    expect(toRequestBody({ ...filledArticle, slug: '' })).not.toHaveProperty('slug');
    expect(toRequestBody(filledArticle)).toMatchObject({ slug: 'invertor-ili-onoff' });
  });

  it('незаполненные поля выдачи уходят как null, а не пустой строкой', () => {
    const body = toRequestBody({ ...filledArticle, seoTitle: '  ', seoDescription: '' });

    expect(body).toMatchObject({ seoTitle: null, seoDescription: null });
  });

  it('пустые строки внутри текста сохраняются: ими разделяются блоки', () => {
    const body = toRequestBody(filledArticle);

    expect(body.body).toContain('\n\n');
    expect(body.body).toContain('## Коротко');
  });

  it('черновик уходит черновиком', () => {
    expect(toRequestBody({ ...filledArticle, published: false })).toMatchObject({
      published: false,
    });
  });
});
