import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { testEnv, settingsMock } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-notify',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'live',
    TELEGRAM_TRANSPORT: 'direct',
    TELEGRAM_BOT_TOKEN: 'token',
    TELEGRAM_CHAT_ID: '100',
    SMTP_HOST: 'smtp.example.test',
    SMTP_FROM: 'site@example.test',
    NOTIFY_EMAIL_TO: 'owner@example.test',
  } as Record<string, unknown>,
  settingsMock: { getGroup: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/settings', () => settingsMock);

/* Страница вызывает проверку роли первой строкой (ADR-095). Здесь проверяется
   её содержимое, а не доступ: сессии в тестовом окружении нет вовсе. */
vi.mock('@/server/guards', () => ({
  requireOwnerPage: vi.fn(async () => ({
    userId: 'u1',
    login: 'admin',
    name: null,
    role: 'owner',
    expiresAt: new Date('2026-12-31'),
  })),
}));

const { default: NotificationsPage } = await import('./page');
const { notificationsPageContent: texts } = await import('./content');

beforeEach(() => {
  vi.clearAllMocks();
  testEnv.TELEGRAM_BOT_TOKEN = 'token';
  testEnv.SMTP_HOST = 'smtp.example.test';
  settingsMock.getGroup.mockResolvedValue({ telegram: true, email: true });
});

describe('Раздел «Уведомления»', () => {
  it('🔴 говорит, что заявка в любом случае попадает в админку', async () => {
    render(await NotificationsPage());

    expect(screen.getByText(texts.alwaysTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.alwaysText)).toBeInTheDocument();
  });

  it('оба канала выбраны и настроены — оба показаны рабочими', async () => {
    render(await NotificationsPage());

    expect(screen.getAllByText(texts.stateWorking)).toHaveLength(2);
    expect(screen.queryByText(texts.noneTitle)).not.toBeInTheDocument();
  });

  it('выключенный владельцем канал так и подписан', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: false, email: true });

    render(await NotificationsPage());

    expect(screen.getByText(texts.stateOffByOwner)).toBeInTheDocument();
    expect(screen.getByText(texts.stateWorking)).toBeInTheDocument();
  });

  it('🔴 выбран, но без доступов на сервере — видно, чего не хватает', async () => {
    testEnv.TELEGRAM_BOT_TOKEN = '';

    render(await NotificationsPage());

    expect(screen.getByText(texts.stateNotConfigured)).toBeInTheDocument();
    expect(screen.getByText(texts.missingTelegram)).toBeInTheDocument();
  });

  it('🔴 когда не работает ни один канал, страница говорит об этом прямо', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: false, email: false });

    render(await NotificationsPage());

    expect(screen.getByText(texts.noneTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.noneText)).toBeInTheDocument();
  });

  it('🔴 ни токена, ни пароля почты на странице нет: доступы живут в окружении', async () => {
    const { container } = render(await NotificationsPage());

    expect(container.textContent).not.toContain('token');
    expect(container.textContent).not.toContain('smtp.example.test');
  });
});
