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
