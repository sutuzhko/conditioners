import { NOTIFICATIONS_GROUP, SettingsForm, toGroupValue } from '@/features/settings-form';
import { isEmailConfigured } from '@/server/notifications/channels/email';
import { isTelegramConfigured } from '@/server/notifications/channels/telegram';
import { loadNotificationPrefs } from '@/server/notifications/prefs';
import { getGroup } from '@/server/repo/settings';
import { Badge, Card } from '@/shared/ui';

import styles from './page.module.css';
import { notificationsPageContent as texts } from './content';

type ChannelState = {
  readonly title: string;
  /** Выбран ли канал владельцем. */
  readonly chosen: boolean;
  /** Готовы ли доступы на сервере. */
  readonly configured: boolean;
  /** Чего не хватает, если не готов. */
  readonly missing: string;
};

/** Готовность каналов и форма выбора — первый кусок потока. */
export async function ChannelsBlock() {
  const [stored, prefs] = await Promise.all([getGroup('notifications'), loadNotificationPrefs()]);

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

  return (
    <div className={styles.block}>
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

      {/* Группа здесь одна и ждать соседей ей не от кого — своя кнопка. */}
      <SettingsForm group={NOTIFICATIONS_GROUP} value={toGroupValue(stored)} />
    </div>
  );
}
