import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { testEnv, settingsMock, notificationsMock, usersMock } = vi.hoisted(() => ({
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
  notificationsMock: {
    deliverySummary: vi.fn(),
    recentFailures: vi.fn(),
    recentPersonal: vi.fn(),
  },
  usersMock: { listDeliveryTargets: vi.fn() },
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));
vi.mock('@/server/repo/settings', () => settingsMock);

/* Журнал доставки и команда читаются из базы: страница проверяется на своих
   данных, а не на том, что оказалось в дев-базе в момент прогона. */
vi.mock('@/server/repo/notifications', () => notificationsMock);
vi.mock('@/server/repo/admin-users', () => usersMock);

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
/* 🔴 Блоки рендерятся отдельно от страницы: их данные приезжают своим куском
   потока внутри `DataBlock`, и `render(await Page())` показал бы заготовку,
   а не содержимое (issue #334). Что страница их вообще зовёт — проверяет
   отдельный тест ниже. */
const { ChannelsBlock } = await import('./ChannelsBlock');
const { DeliveryBlock } = await import('./DeliveryBlock');
const { notificationsPageContent: texts } = await import('./content');
const { deliveryLogContent: logTexts } = await import('@/features/delivery-log');

const INSTALLER = {
  id: 'u2',
  name: 'Дмитрий Соколов',
  login: 'sokolov',
  role: 'installer',
  active: true,
  telegramChatId: null,
  email: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  testEnv.TELEGRAM_BOT_TOKEN = 'token';
  testEnv.SMTP_HOST = 'smtp.example.test';
  settingsMock.getGroup.mockResolvedValue({ telegram: true, email: true });
  notificationsMock.deliverySummary.mockResolvedValue([]);
  notificationsMock.recentFailures.mockResolvedValue([]);
  notificationsMock.recentPersonal.mockResolvedValue([]);
  usersMock.listDeliveryTargets.mockResolvedValue([INSTALLER]);
});

describe('Раздел «Уведомления»', () => {
  it('🔴 говорит, что заявка в любом случае попадает в админку', async () => {
    render(await NotificationsPage());

    expect(screen.getByText(texts.alwaysTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.alwaysText)).toBeInTheDocument();
  });

  it('оба канала выбраны и настроены — оба показаны рабочими', async () => {
    render(await ChannelsBlock());

    expect(screen.getAllByText(texts.stateWorking)).toHaveLength(2);
    expect(screen.queryByText(texts.noneTitle)).not.toBeInTheDocument();
  });

  it('выключенный владельцем канал так и подписан', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: false, email: true });

    render(await ChannelsBlock());

    expect(screen.getByText(texts.stateOffByOwner)).toBeInTheDocument();
    expect(screen.getByText(texts.stateWorking)).toBeInTheDocument();
  });

  it('🔴 выбран, но без доступов на сервере — видно, чего не хватает', async () => {
    testEnv.TELEGRAM_BOT_TOKEN = '';

    render(await ChannelsBlock());

    expect(screen.getByText(texts.stateNotConfigured)).toBeInTheDocument();
    expect(screen.getByText(texts.missingTelegram)).toBeInTheDocument();
  });

  it('🔴 когда не работает ни один канал, страница говорит об этом прямо', async () => {
    settingsMock.getGroup.mockResolvedValue({ telegram: false, email: false });

    render(await ChannelsBlock());

    expect(screen.getByText(texts.noneTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.noneText)).toBeInTheDocument();
  });

  it('🔴 ни токена, ни пароля почты на странице нет: доступы живут в окружении', async () => {
    const { container } = render(await ChannelsBlock());

    expect(container.textContent).not.toContain('token');
    expect(container.textContent).not.toContain('smtp.example.test');
  });

  it('🔴 режим журнала виден баннером: снаружи он неотличим от рабочего', async () => {
    testEnv.NOTIFY_DRIVER = 'log';

    render(await NotificationsPage());

    expect(screen.getByText(texts.logDriverTitle)).toBeInTheDocument();
  });

  it('в боевом режиме баннера про журнал нет', async () => {
    testEnv.NOTIFY_DRIVER = 'live';

    render(await NotificationsPage());

    expect(screen.queryByText(texts.logDriverTitle)).not.toBeInTheDocument();
  });

  it('🔴 показывает адреса доставки по людям: без них наряд никому не уйдёт', async () => {
    render(await DeliveryBlock());

    expect(screen.getByText(logTexts.addressesTitle)).toBeInTheDocument();
    expect(screen.getByText('Дмитрий Соколов')).toBeInTheDocument();
    expect(screen.getByText(logTexts.telegramMissing)).toBeInTheDocument();
  });

  /* Код показан строкой с кнопкой копирования (issue #38): восьмизначный
     код перенабирают руками, и ошибка в одном знаке из восьми стоит звонка. */
  it('🔴 непривязанному человеку показывается код: сам он chat ID не узнает', async () => {
    render(await DeliveryBlock());

    expect(screen.getByText(/^[2-9A-HJ-NP-Z]{8}$/)).toBeInTheDocument();
  });

  /* 🔴 Подсказка про код стоит один раз над списком, а не под каждым
     человеком: пять одинаковых абзацев вытесняли сами адреса (issue #38). */
  it('подсказку про код привязки показывает один раз', async () => {
    render(await DeliveryBlock());

    expect(screen.getAllByText(logTexts.codeHint)).toHaveLength(1);
  });

  /* 🔴 Заготовка на месте блока — обещание раскладки: страница обязана
     показать её сразу, не дожидаясь четырёх запросов к базе (issue #334). */
  it('пока данные едут, на их месте стоят заготовки обоих блоков', async () => {
    const { container } = render(await NotificationsPage());

    expect(screen.getByText(texts.statusTitle)).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('🔴 владелец видит ленту того, что ушло людям: копию сообщением он не получает', async () => {
    notificationsMock.recentPersonal.mockResolvedValue([
      {
        id: 'n-1',
        channel: 'telegram',
        kind: 'order-assigned',
        attempts: 1,
        lastError: null,
        status: 'sent',
        createdAt: '2026-08-26T10:00:00.000Z',
        nextTryAt: '2026-08-26T10:00:00.000Z',
        sentAt: '2026-08-26T10:00:02.000Z',
        recipient: 'Дмитрий Соколов',
        address: '551234567',
        title: 'Вам назначен наряд № 1059',
      },
    ]);

    render(await DeliveryBlock());

    expect(screen.getByText('Вам назначен наряд № 1059')).toBeInTheDocument();
    expect(screen.getByText(logTexts.statusSent)).toBeInTheDocument();
  });
});
