// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { testEnv, settingsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-prefs',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'live',
    TELEGRAM_TRANSPORT: 'direct',
    TELEGRAM_CHAT_ID: 'chat-из-окружения',
    NOTIFY_EMAIL_TO: 'env@example.test',
  } as Record<string, unknown>,
  settingsMock: { getGroup: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/settings', () => settingsMock);

const { loadNotificationPrefs } = await import('./prefs');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Настройки доставки уведомлений', () => {
  it('берёт выбор владельца из настроек', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: false, email: true });

    const prefs = await loadNotificationPrefs();

    expect(prefs.telegram.enabled).toBe(false);
    expect(prefs.email.enabled).toBe(true);
  });

  it('адрес из настроек важнее значения из окружения', async () => {
    settingsMock.getGroup.mockResolvedValue({
      telegram: true,
      email: true,
      telegramChatId: '-100500',
      emailTo: 'owner@example.test',
    });

    const prefs = await loadNotificationPrefs();

    expect(prefs.telegram.chatId).toBe('-100500');
    expect(prefs.email.to).toBe('owner@example.test');
  });

  it('пустой адрес в настройках означает «взять из окружения»', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: true, email: true, telegramChatId: '' });

    const prefs = await loadNotificationPrefs();

    expect(prefs.telegram.chatId).toBe('chat-из-окружения');
    expect(prefs.email.to).toBe('env@example.test');
  });

  it('🔴 группа не сохранена — оба канала включены: молчать по умолчанию нельзя', async () => {
    settingsMock.getGroup.mockResolvedValue(null);

    const prefs = await loadNotificationPrefs();

    expect(prefs.telegram.enabled).toBe(true);
    expect(prefs.email.enabled).toBe(true);
  });

  it('🔴 испорченная запись не роняет приём заявки, а откатывается к умолчаниям', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: 'да', email: 42 });

    const prefs = await loadNotificationPrefs();

    expect(prefs.telegram.enabled).toBe(true);
    expect(prefs.email.enabled).toBe(true);
  });

  it('🔴 недоступная база не роняет приём заявки', async () => {
    settingsMock.getGroup.mockRejectedValue(new Error('база недоступна'));

    const prefs = await loadNotificationPrefs();

    expect(prefs.telegram.enabled).toBe(true);
    expect(prefs.email.to).toBe('env@example.test');
  });
});
