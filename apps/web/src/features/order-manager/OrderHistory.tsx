import { Card } from '@/shared/ui';

import { orderManagerContent as texts } from './content';
import type { OrderHistoryEntry } from './model';
import styles from './OrderHistory.module.css';

export interface OrderHistoryProps {
  readonly entries: readonly OrderHistoryEntry[];
}

/**
 * История наряда: кто и когда менял статус, кого назначили, когда заполнили итог.
 *
 * 🔴 Раздел владельца. Монтажнику история не приходит вовсе — сервер не кладёт
 * этот ключ в его ответ: в записях лежат переназначения, то есть разговор
 * владельца с людьми, а не работа монтажника (docs/CRM.md §6).
 *
 * Компонент серверный: он ничего не делает, кроме показа, и клиентский
 * рантайм ради списка строк был бы потраченным бюджетом.
 */
export function OrderHistory({ entries }: OrderHistoryProps) {
  return (
    <Card as="section" aria-labelledby="order-history-title">
      <h2 className={styles.title} id="order-history-title">
        {texts.historyTitle}
      </h2>
      <p className={styles.hint}>{texts.historyHint}</p>

      {entries.length === 0 ? (
        <p className={styles.empty}>{texts.historyEmpty}</p>
      ) : (
        <ol className={styles.list}>
          {entries.map((entry) => (
            <li className={styles.entry} key={entry.id}>
              <time className={styles.when} dateTime={entry.createdAt}>
                {texts.stamp(entry.createdAt)}
              </time>
              <span className={styles.text}>{entry.text}</span>
              <span className={styles.author}>{entry.author ?? texts.historyAuthorless}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
