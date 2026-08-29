// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_API_TEXTS } from '@/shared/config/admin-api';

import { profileApi } from './lib';
import { profileFormContent as texts } from './content';

/**
 * 🔴 Истёкшая сессия обязана отличаться от отказа сервера, и на экране смены
 * пароля это важнее, чем где бы то ни было: человек, прочитавший «сервер не
 * принял изменения», начнёт подбирать пароль вместо того, чтобы войти заново.
 *
 * Поведение даёт общий разбор ответа (ADR-030). Тест стережёт не его, а то,
 * что фича им пользуется: своя копия разбора здесь уже была и 401 не отличала.
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

function respondWith(status: number, body: unknown = null): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      body === null
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
    ),
  );
}

describe('профиль: разбор ответа', () => {
  it('🔴 истёкшая сессия объясняется общим текстом панели, а не отказом сервера', async () => {
    respondWith(401);

    await expect(profileApi.save({ name: 'Алексей', phone: null })).resolves.toEqual({
      ok: false,
      message: ADMIN_API_TEXTS.session,
    });
  });

  it('🔴 то же на смене пароля: иначе человек примется подбирать пароль', async () => {
    respondWith(401);

    await expect(
      profileApi.changePassword({ current: 'старый', next: 'новый-пароль' }),
    ).resolves.toEqual({ ok: false, message: ADMIN_API_TEXTS.session });
  });

  it('отказ сервера остаётся отказом сервера', async () => {
    respondWith(500);

    await expect(profileApi.save({ name: 'Алексей', phone: null })).resolves.toEqual({
      ok: false,
      message: texts.serverError,
    });
  });

  it('сообщение сервера доносится как есть, а не подменяется общим', async () => {
    respondWith(400, { error: { code: 'validation_error', message: 'Текущий пароль неверен' } });

    await expect(
      profileApi.changePassword({ current: 'не тот', next: 'новый-пароль' }),
    ).resolves.toEqual({ ok: false, message: 'Текущий пароль неверен' });
  });

  it('упавшая сеть говорит, что изменения не сохранены', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(profileApi.save({ name: 'Алексей', phone: null })).resolves.toEqual({
      ok: false,
      message: texts.networkError,
    });
  });
});
