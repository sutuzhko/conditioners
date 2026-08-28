import { afterEach, describe, expect, it, vi } from 'vitest';

import { leadFormContent as texts } from './content';
import type { LeadContext } from '@/entities/lead/model';

import {
  CONTEXT_FIELD,
  LEAD_ENDPOINT,
  applyLeadSubject,
  buildLeadFormData,
  describeLeadContext,
  emptyLeadValues,
  postLead,
  validateLeadValues,
} from './lib';
import { modelsFixture } from './fixtures';

const filled = {
  ...emptyLeadValues('Монтаж и установка'),
  name: 'Ирина',
  phone: '+7 900 123-45-67',
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

describe('validateLeadValues', () => {
  it('пропускает заполненную форму', () => {
    expect(validateLeadValues(filled)).toBeNull();
  });

  it('сообщения об ошибках написаны по-русски', () => {
    const errors = validateLeadValues(emptyLeadValues('Консультация'));

    expect(errors).not.toBeNull();
    for (const message of Object.values(errors ?? {})) {
      expect(message).not.toMatch(/[A-Za-z]/);
    }
  });

  it('требует согласия на обработку данных', () => {
    expect(validateLeadValues({ ...filled, consent: false })?.consent).toMatch(/согласия/i);
  });
});

describe('buildLeadFormData', () => {
  it('🔴 модель уезжает с заявкой отдельным полем: владелец знает предмет разговора', () => {
    const data = buildLeadFormData({ ...filled, model: 'Сплит-система 09' }, null, '');

    expect(data.get('model')).toBe('Сплит-система 09');
  });

  it('стёртое человеком поле модели не уходит вовсе, а не уходит пустым', () => {
    expect(buildLeadFormData({ ...filled, model: '   ' }, null, '').has('model')).toBe(false);
  });

  it('не отправляет пустые поля и шлёт время звонка каноническим именем', () => {
    const data = buildLeadFormData({ ...filled, callTime: 'Утром (9:00–12:00)' }, null, '');

    expect(data.get('callTime')).toBe('Утром (9:00–12:00)');
    expect(data.has('place')).toBe(false);
    expect(data.has('comment')).toBe(false);
    expect(data.get('consent')).toBe('true');
    expect(data.get('hp')).toBe('');
  });
});

describe('postLead', () => {
  it('шлёт форму на контрактный адрес и возвращает идентификатор заявки', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(respond(201, { id: 'lead-7' })));
    vi.stubGlobal('fetch', fetchMock);

    const result = await postLead(buildLeadFormData(filled, null, ''));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(LEAD_ENDPOINT);
    expect(call?.[1]).toMatchObject({ method: 'POST' });
    // тело — FormData: заголовок multipart с границей частей проставляет браузер
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
    expect(result).toEqual({ ok: true, id: 'lead-7' });
  });

  it('показывает текст из конверта ошибки', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          respond(400, {
            error: { code: 'validation_error', message: 'Укажите телефон', field: 'phone' },
          }),
        ),
      ),
    );

    await expect(postLead(new FormData())).resolves.toEqual({
      ok: false,
      message: 'Укажите телефон',
      field: 'phone',
    });
  });

  it('на ответ без понятного текста подставляет объяснение по коду', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('', { status: 429 }))),
    );

    await expect(postLead(new FormData())).resolves.toEqual({
      ok: false,
      message: texts.errorRateLimited,
    });
  });

  it('обрыв связи — это результат, а не исключение', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );

    await expect(postLead(new FormData())).resolves.toEqual({
      ok: false,
      message: texts.errorNetwork,
    });
  });
});

/** Человек посчитал смету, подобрал модель и отметил ещё одну. */
const context: LeadContext = {
  estimate: {
    params: [{ label: 'Класс мощности', value: '09 · до 27 м²' }],
    lines: [{ label: 'Базовый монтаж, класс 09', amount: 6000 }],
    perUnit: null,
    qty: 1,
    total: 6000,
  },
  pick: {
    area: 25,
    place: 'Квартира',
    model: { slug: 'split-09', name: 'Сплит-система 09', price: 34_900, oldPrice: 39_900 },
  },
  model: null,
  liked: [{ slug: 'split-07', name: 'Сплит-система 07', price: 28_900, oldPrice: null }],
};

describe('контекст в теле формы', () => {
  it('уходит отдельным полем и только когда он есть', () => {
    expect(buildLeadFormData(filled, null, '').get(CONTEXT_FIELD)).toBeNull();

    const raw = buildLeadFormData(filled, null, '', context).get(CONTEXT_FIELD);
    expect(typeof raw).toBe('string');
    expect(JSON.parse(String(raw))).toMatchObject({ estimate: { total: 6000 } });
  });

  it('человек видит, что именно уедет вместе с телефоном', () => {
    const shown = describeLeadContext(context);

    expect(shown.map((entry) => entry.label)).toEqual([
      texts.contextEstimate,
      texts.contextPick,
      texts.contextLiked,
    ]);
    expect(shown[0]?.value).toContain('6');
    // подбор показывается вместе с тем, что подобралось
    expect(shown[1]?.value).toContain('Сплит-система 09');
    expect(shown[1]?.value).toContain('25');
  });

  it('перечёркнутая цена показывается только там, где она была', () => {
    const [, pick] = describeLeadContext(context);
    expect(pick?.value).toContain('вместо');

    const [liked] = describeLeadContext({ ...context, estimate: null, pick: null });
    expect(liked?.value).not.toContain('вместо');
  });

  it('без контекста показывать нечего', () => {
    expect(describeLeadContext(null)).toEqual([]);
  });
});

describe('applyLeadSubject', () => {
  const values = emptyLeadValues('Консультация');

  it('слаг из адреса становится названием модели: человеку виден товар, а не слаг', () => {
    const next = applyLeadSubject(values, { model: 'split-09' }, modelsFixture, 'Консультация');

    expect(next.model).toBe('Сплит-система 09');
  });

  it('🔴 неизвестный слаг молча даёт пустое поле, а не отказ: адрес правят руками', () => {
    const next = applyLeadSubject(
      { ...values, model: 'Сплит-система 12' },
      { model: 'snyata-s-prodazhi' },
      modelsFixture,
      'Консультация',
    );

    expect(next.model).toBe('');
  });

  it('ключ темы из адреса разворачивается в подпись из общего списка', () => {
    const next = applyLeadSubject(values, { topic: 'install' }, modelsFixture, 'Консультация');

    expect(next.topic).toBe('Монтаж и установка');
  });

  it('неизвестный ключ темы даёт тему по умолчанию, а не пустой список', () => {
    const next = applyLeadSubject(values, { topic: 'montazh' }, modelsFixture, 'Сервис и ремонт');

    expect(next.topic).toBe('Сервис и ремонт');
  });

  it('параметр, которого в адресе нет, поля не трогает', () => {
    const typed = { ...values, model: 'что-нибудь на 20 метров', topic: 'ТО и чистка' };
    const next = applyLeadSubject(typed, { topic: 'install' }, modelsFixture, 'Консультация');

    expect(next.model).toBe('что-нибудь на 20 метров');
    expect(next.topic).toBe('Монтаж и установка');
  });
});
