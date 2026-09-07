import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, settingsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-layout',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'off',
  },
  settingsMock: { getAll: vi.fn(), readiness: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/settings', () => settingsMock);

const { generateMetadata } = await import('./layout');

beforeEach(() => {
  vi.clearAllMocks();
  settingsMock.getAll.mockResolvedValue({});
});

describe('Каркас публичной части — индексируемость (ADR-090)', () => {
  it('🔴 пока настройки не заполнены, публичная часть под noindex', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: false, groups: [] });

    expect(await generateMetadata()).toEqual({ robots: { index: false, follow: false } });
  });

  it('🔴 заполненные настройки снимают запрет сами, без ручного шага', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: true, groups: [] });

    expect(await generateMetadata()).toEqual({});
  });
});

describe('Каркас публичной части — подтверждение прав (issue #679)', () => {
  it('поля пустые — тега подтверждения нет вовсе', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: true, groups: [] });
    settingsMock.getAll.mockResolvedValue({ seo: { yandexVerification: '' } });

    expect(await generateMetadata()).toEqual({});
  });

  it('заполненное поле уезжает в метаданные штатным `verification`', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: true, groups: [] });
    settingsMock.getAll.mockResolvedValue({
      seo: { yandexVerification: 'a1b2c3', googleVerification: 'd4e5f6' },
    });

    expect(await generateMetadata()).toEqual({
      verification: { yandex: 'a1b2c3', google: 'd4e5f6' },
    });
  });

  it('заполнено одно из двух — второго ключа в метаданных нет', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: true, groups: [] });
    settingsMock.getAll.mockResolvedValue({ seo: { googleVerification: 'd4e5f6' } });

    expect(await generateMetadata()).toEqual({ verification: { google: 'd4e5f6' } });
  });

  /* 🔴 Права подтверждаются как раз до открытия индексации: если тег исчезнет
     под noindex, первый шаг после выкладки станет невозможным. */
  it('🔴 под noindex тег остаётся: подтверждение прав идёт раньше индексации', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: false, groups: [] });
    settingsMock.getAll.mockResolvedValue({ seo: { yandexVerification: 'a1b2c3' } });

    expect(await generateMetadata()).toEqual({
      verification: { yandex: 'a1b2c3' },
      robots: { index: false, follow: false },
    });
  });

  /* Владелец копирует из Вебмастера целый тег — схема достаёт значение сама. */
  it('вставленный целиком тег доезжает до метаданных одним значением', async () => {
    settingsMock.readiness.mockResolvedValue({ ready: true, groups: [] });
    settingsMock.getAll.mockResolvedValue({
      seo: { yandexVerification: '<meta name="yandex-verification" content="a1b2c3" />' },
    });

    expect(await generateMetadata()).toEqual({ verification: { yandex: 'a1b2c3' } });
  });
});
