import { env } from '@/shared/config/env';
import { Card } from '@/shared/ui';

import { ChannelsSkeleton, DeliverySkeleton } from './NotificationsSkeletons';
import { notificationsPageContent as texts } from './content';
import styles from './page.module.css';

/**
 * Уведомления: шапка и поясняющие карточки настоящие — их текст не зависит от
 * данных, — состояние каналов, адреса и журнал заготовками (issue #334).
 * Баннер режима журнала стоит по той же переменной окружения, что и на
 * странице: скелетон без него обещал бы раскладку без баннера.
 */
export default function NotificationsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      {env.NOTIFY_DRIVER === 'log' ? (
        <Card variant="accent" padding="md" className={styles.none}>
          <p className={styles.noneTitle}>{texts.logDriverTitle}</p>
          <p className={styles.noneText}>{texts.logDriverText}</p>
        </Card>
      ) : null}

      <Card variant="soft" padding="md" className={styles.always}>
        <p className={styles.alwaysTitle}>{texts.alwaysTitle}</p>
        <p className={styles.alwaysText}>{texts.alwaysText}</p>
      </Card>

      <ChannelsSkeleton />
      <DeliverySkeleton />
    </div>
  );
}
