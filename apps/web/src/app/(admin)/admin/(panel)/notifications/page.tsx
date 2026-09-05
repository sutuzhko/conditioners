import type { Metadata } from 'next';

import { requireOwnerPage } from '@/server/guards';
import { env } from '@/shared/config/env';
import { Card } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { ChannelsBlock } from './ChannelsBlock';
import { DeliveryBlock } from './DeliveryBlock';
import { ChannelsSkeleton, DeliverySkeleton } from './NotificationsSkeletons';
import styles from './page.module.css';
import { notificationsPageContent as texts } from './content';

export const metadata: Metadata = { title: 'Уведомления' };

/* Страница читает настройки при каждом заходе: она же их и правит. */
export const dynamic = 'force-dynamic';

/**
 * Каналы уведомлений.
 *
 * 🔴 Владелец решает, куда уходит сообщение; доступы к каналам (токен бота,
 * пароль SMTP) остаются в переменных окружения — их правит тот, кто держит
 * сервер (инвариант 3). Поэтому страница показывает две разные вещи: что
 * выбрано здесь и что вообще способно работать.
 *
 * 🔴 Раздел состоит из двух независимых блоков (issue #334, #336): настройка
 * каналов и журнал доставки. Журнал ходит в четыре таблицы и падает не вместе
 * с настройкой — упавший журнал не имеет права уносить с экрана форму, ради
 * которой в раздел заходят. Проверка доступа идёт до первого чтения данных
 * (ADR-095).
 */
export default async function AdminNotificationsPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

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

      {/* 🔴 Обе вводные плашки одной плотности: разные отступы давали
          заголовки на 277 и 289 пикселях, и разница в двенадцать пикселей на
          соседних блоках читалась ошибкой вёрстки (issue #38, BUGS). */}
      <Card variant="soft" padding="md" className={styles.always}>
        <p className={styles.alwaysTitle}>{texts.alwaysTitle}</p>
        <p className={styles.alwaysText}>{texts.alwaysText}</p>
      </Card>

      <DataBlock
        skeleton={<ChannelsSkeleton />}
        title={texts.channelsLoadFailed}
        note={blockErrorNote('/admin/notifications')}
        surface="bare"
      >
        <ChannelsBlock />
      </DataBlock>

      <DataBlock
        skeleton={<DeliverySkeleton />}
        title={texts.deliveryLoadFailed}
        note={blockErrorNote('/admin/notifications')}
        surface="bare"
      >
        <DeliveryBlock />
      </DataBlock>
    </div>
  );
}
