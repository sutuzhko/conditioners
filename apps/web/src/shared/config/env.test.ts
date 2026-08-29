// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * 🔴 Схема окружения — предохранитель старта: приложение не должно подниматься
 * с конфигурацией, при которой оно молча ничего не делает. Проверка идёт через
 * повторный импорт модуля: он читает `process.env` один раз, при загрузке,
 * и именно это поведение здесь и проверяется.
 */
const BASE: Readonly<Record<string, string>> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:pass@db:5432/test',
  SITE_URL: 'https://example.test',
  SESSION_SECRET: '0123456789abcdef',
};

async function loadEnv(overrides: Readonly<Record<string, string>>): Promise<unknown> {
  vi.resetModules();
  /* Начисто: в окружении контейнера уже стоят SMTP и телеграм, и без очистки
     проверка «live без каналов» проходила бы по чужим значениям. Переменная
     именно удаляется, а не обнуляется: у `NOTIFY_DRIVER` и `TELEGRAM_TRANSPORT`
     есть значение по умолчанию, и оно применяется к отсутствующему полю, а не
     к пустой строке — пустая строка перечислением отвергается. */
  vi.unstubAllEnvs();
  for (const key of [
    'NOTIFY_DRIVER',
    'SMTP_HOST',
    'SMTP_FROM',
    'TELEGRAM_TRANSPORT',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_PROXY_URL',
  ]) {
    vi.stubEnv(key, undefined);
  }
  for (const [key, value] of Object.entries({ ...BASE, ...overrides })) {
    vi.stubEnv(key, value);
  }

  const loaded = await import('./env');
  return loaded.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('конфигурация окружения', () => {
  it('полного набора достаточно: режим log каналов не требует', async () => {
    await expect(loadEnv({ NOTIFY_DRIVER: 'log' })).resolves.toMatchObject({
      NOTIFY_DRIVER: 'log',
    });
  });

  it('🔴 в production http не проходит: сессия ушла бы в открытом трафике', async () => {
    await expect(
      loadEnv({ NODE_ENV: 'production', SITE_URL: 'http://example.test' }),
    ).rejects.toThrow('в production сайт обязан отдаваться по https');
  });

  it('🔴 live без единого канала не поднимается', async () => {
    await expect(loadEnv({ NOTIFY_DRIVER: 'live' })).rejects.toThrow(
      'live без единого настроенного канала',
    );
  });

  it('live с настроенной почтой поднимается', async () => {
    await expect(
      loadEnv({
        NOTIFY_DRIVER: 'live',
        SMTP_HOST: 'smtp.example.test',
        SMTP_FROM: 'site@example.test',
      }),
    ).resolves.toMatchObject({ NOTIFY_DRIVER: 'live' });
  });

  it('live с одним телеграмом тоже поднимается: канал выбирает владелец', async () => {
    await expect(
      loadEnv({
        NOTIFY_DRIVER: 'live',
        TELEGRAM_TRANSPORT: 'direct',
        TELEGRAM_BOT_TOKEN: '123:abc',
      }),
    ).resolves.toMatchObject({ NOTIFY_DRIVER: 'live' });
  });

  it('🔴 токен при выключенном транспорте каналом не считается', async () => {
    await expect(
      loadEnv({ NOTIFY_DRIVER: 'live', TELEGRAM_TRANSPORT: 'off', TELEGRAM_BOT_TOKEN: '123:abc' }),
    ).rejects.toThrow('live без единого настроенного канала');
  });

  it('🔴 транспорт proxy без адреса прокси не поднимается', async () => {
    await expect(
      loadEnv({
        NOTIFY_DRIVER: 'live',
        TELEGRAM_TRANSPORT: 'proxy',
        TELEGRAM_BOT_TOKEN: '123:abc',
      }),
    ).rejects.toThrow('транспорт proxy требует адреса прокси');
  });

  it('транспорт proxy с адресом поднимается', async () => {
    await expect(
      loadEnv({
        NOTIFY_DRIVER: 'live',
        TELEGRAM_TRANSPORT: 'proxy',
        TELEGRAM_BOT_TOKEN: '123:abc',
        TELEGRAM_PROXY_URL: 'http://proxy.example.test:3128',
      }),
    ).resolves.toMatchObject({ TELEGRAM_TRANSPORT: 'proxy' });
  });
});
