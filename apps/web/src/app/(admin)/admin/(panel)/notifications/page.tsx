import type { Metadata } from 'next';

import { DeliveryLog } from '@/features/delivery-log';
import { NOTIFICATIONS_GROUP, SettingsForm, type GroupValue } from '@/features/settings-form';
import { requireOwnerPage } from '@/server/guards';
import { isEmailConfigured } from '@/server/notifications/channels/email';
import { isTelegramConfigured } from '@/server/notifications/channels/telegram';
import { loadNotificationPrefs } from '@/server/notifications/prefs';
import { deliverySummary, recentFailures } from '@/server/repo/notifications';
import { getGroup } from '@/server/repo/settings';
import { env } from '@/shared/config/env';
import { Badge, Card } from '@/shared/ui';

import styles from './page.module.css';
import { notificationsPageContent as texts } from './content';

export const metadata: Metadata = { title: 'Уведомления' };

/* Страница читает настройки при каждом заходе: она же их и правит. */
export const dynamic = 'force-dynamic';

type ChannelState = {
  readonly title: string;
  /** Выбран ли канал владельцем. */
  readonly chosen: boolean;
  /** Готовы ли доступы на сервере. */
  readonly configured: boolean;
  /** Чего не хватает, если не готов. */
  readonly missing: string;
};

/**
 * Каналы уведомлений.
 *
 * 🔴 Владелец решает, куда уходит сообщение; доступы к каналам (токен бота,
 * пароль SMTP) остаются в переменных окружения — их правит тот, кто держит
 * сервер (инвариант 3). Поэтому страница показывает две разные вещи: что
 * выбрано здесь и что вообще способно работать.
 */
export default async function AdminNotificationsPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const [stored, prefs, summary, failures] = await Promise.all([
    getGroup('notifications'),
    loadNotificationPrefs(),
    deliverySummary(),
    recentFailures(),
  ]);

  const channels: readonly ChannelState[] = [
    {
      title: texts.channelTelegram,
      chosen: prefs.telegram.enabled,
      configured: isTelegramConfigured(prefs.telegram.chatId),
      missing: texts.missingTelegram,
    },
    {
      title: texts.channelEmail,
      chosen: prefs.email.enabled,
      configured: isEmailConfigured(prefs.email.to),
      missing: texts.missingEmail,
    },
  ];

  const working = channels.filter((channel) => channel.chosen && channel.configured);

  const value: GroupValue =
    typeof stored === 'object' && stored !== null && !Array.isArray(stored)
      ? (stored as GroupValue)
      : {};

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      {/* Режим журнала неотличим от рабочего изнутри панели: каналы отвечают
          «настроен», доставка пишет «отправлено» — а наружу не уходит ничего.
          Баннер — единственное место, где это видно (аудит, BUGS). */}
      {env.NOTIFY_DRIVER === 'log' ? (
        <Card variant="accent" padding="md" className={styles.none}>
          <p className={styles.noneTitle}>{texts.logDriverTitle}</p>
          <p className={styles.noneText}>{texts.logDriverText}</p>
        </Card>
      ) : null}

      <Card variant="soft" padding="lg" className={styles.always}>
        <p className={styles.alwaysTitle}>{texts.alwaysTitle}</p>
        <p className={styles.alwaysText}>{texts.alwaysText}</p>
      </Card>

      <section className={styles.status} aria-labelledby="channels-status">
        <h2 className={styles.statusTitle} id="channels-status">
          {texts.statusTitle}
        </h2>
        <p className={styles.statusHint}>{texts.statusHint}</p>

        <ul className={styles.list}>
          {channels.map((channel) => (
            <li className={styles.item} key={channel.title}>
              <span className={styles.itemTitle}>{channel.title}</span>
              {channel.chosen && channel.configured ? (
                <Badge variant="success" size="sm">
                  {texts.stateWorking}
                </Badge>
              ) : !channel.chosen ? (
                <Badge variant="neutral" size="sm">
                  {texts.stateOffByOwner}
                </Badge>
              ) : (
                <>
                  <Badge variant="warning" size="sm">
                    {texts.stateNotConfigured}
                  </Badge>
                  <span className={styles.missing}>{channel.missing}</span>
                </>
              )}
            </li>
          ))}
        </ul>

        {/* Молчащие каналы — не мелочь: владелец узнаёт о заявке из сообщения,
            а не из привычки открывать админку. */}
        {working.length === 0 ? (
          <Card variant="accent" padding="md" className={styles.none}>
            <p className={styles.noneTitle}>{texts.noneTitle}</p>
            <p className={styles.noneText}>{texts.noneText}</p>
          </Card>
        ) : null}
      </section>

      <SettingsForm group={NOTIFICATIONS_GROUP} value={value} />

      {/* Журнал доставки под настройками: сначала владелец правит, куда слать,
          и только потом разбирается, что не дошло. */}
      <DeliveryLog summary={summary} failures={failures} />
    </div>
  );
}
