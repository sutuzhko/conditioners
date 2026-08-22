'use client';

import { useState } from 'react';

import { formatDate } from '@/shared/lib/format';
import { Badge, Button, Card } from '@/shared/ui';

import { deliveryLogContent as texts, kindTitle } from './content';
import { retryDelivery } from './lib';
import type { DeliveryFailureView, DeliverySummaryView, RetryApi } from './model';
import styles from './DeliveryLog.module.css';

export interface DeliveryLogProps {
  readonly summary: readonly DeliverySummaryView[];
  readonly failures: readonly DeliveryFailureView[];
  /** Повтор доставки; по умолчанию — `POST /api/admin/notifications/{id}/retry`. */
  readonly api?: RetryApi | undefined;
}

/**
 * Журнал доставки: сводка по каналам и разбор того, что не дошло.
 *
 * 🔴 Причина сбоя показывается дословно, как её вернул канал: «письмо не
 * пришло» перестаёт быть догадкой, а владелец видит, чинить ли ему настройки
 * или звать того, кто держит сервер.
 *
 * Повтор отправляет тот же снимок события: заявка давно в базе, дублироваться
 * ей не от чего.
 */
export function DeliveryLog({
  summary,
  failures,
  api = { retry: retryDelivery },
}: DeliveryLogProps) {
  const [restored, setRestored] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const handleRetry = async (id: string): Promise<void> => {
    setBusy(id);
    setFailed(null);

    const result = await api.retry(id);

    setBusy(null);
    if (result.ok) {
      setRestored((previous) => [...previous, id]);
      return;
    }
    setFailed(result.message ?? texts.retryError);
  };

  return (
    <div className={styles.log}>
      <section aria-labelledby="delivery-summary">
        <h2 className={styles.title} id="delivery-summary">
          {texts.summaryTitle}
        </h2>

        {summary.length === 0 ? (
          <p className={styles.empty}>{texts.summaryEmpty}</p>
        ) : (
          <ul className={styles.summary}>
            {summary.map((row) => (
              <li className={styles.channel} key={row.channel}>
                <span className={styles.channelName}>{row.channel}</span>
                <span className={styles.counts}>
                  <span>
                    {texts.columnSent}: <b>{row.sent}</b>
                  </span>
                  <span>
                    {texts.columnPending}: <b>{row.pending}</b>
                  </span>
                  <span className={row.failed > 0 ? styles.bad : undefined}>
                    {texts.columnFailed}: <b>{row.failed}</b>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="delivery-failures">
        <h2 className={styles.title} id="delivery-failures">
          {texts.failuresTitle}
        </h2>
        <p className={styles.hint}>{texts.failuresHint}</p>

        {failures.length === 0 ? (
          <p className={styles.empty}>{texts.failuresEmpty}</p>
        ) : (
          <ul className={styles.failures}>
            {failures.map((failure) => {
              const done = restored.includes(failure.id);

              return (
                <li key={failure.id}>
                  <Card variant="soft" padding="md" className={styles.failure}>
                    <div className={styles.head}>
                      <span className={styles.kind}>{kindTitle(failure.kind)}</span>
                      <span className={styles.channelTag}>{failure.channel}</span>
                      <Badge variant={failure.status === 'failed' ? 'sale' : 'warning'} size="sm">
                        {failure.status === 'failed' ? texts.statusFailed : texts.statusRetrying}
                      </Badge>
                      <span className={styles.meta}>
                        {formatDate(failure.createdAt)} · {texts.attempts(failure.attempts)}
                      </span>
                    </div>

                    {failure.lastError === null ? null : (
                      <p className={styles.reason}>{failure.lastError}</p>
                    )}

                    {failure.status === 'failed' ? (
                      done ? (
                        <p className={styles.done}>{texts.retryDone}</p>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy === failure.id}
                          onClick={() => {
                            void handleRetry(failure.id);
                          }}
                        >
                          {busy === failure.id ? texts.retrying : texts.retry}
                        </Button>
                      )
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {failed === null ? null : (
          <p className={styles.error} role="alert">
            {failed}
          </p>
        )}
      </section>
    </div>
  );
}
