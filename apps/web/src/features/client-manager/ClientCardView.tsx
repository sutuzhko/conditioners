import Link from 'next/link';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Card } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import type { ClientCard } from './model';
import styles from './ClientCardView.module.css';

export interface ClientCardViewProps {
  readonly client: ClientCard;
}

/**
 * Клиент в списке.
 *
 * Серверный компонент: карточка ничего не делает, кроме показа, — правка
 * живёт в самой карточке клиента. Держать список интерактивным значило бы
 * платить за это бюджетом JS панели без единого сценария.
 */
export function ClientCardView({ client }: ClientCardViewProps) {
  return (
    <Card as="article" className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.name}>
          <Link
            className={`${styles.link} tapAction`}
            href={{ pathname: `/admin/clients/${client.id}` }}
          >
            {client.name}
          </Link>
        </h2>

        <Badge variant={client.leadCount > 0 ? 'accent' : 'neutral'}>
          {texts.leadCount(client.leadCount)}
        </Badge>
      </div>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{texts.phone}</dt>
          <dd>
            {/* Телефон ссылкой: по клиенту звонят, и набирать номер руками с
                экрана — лишний способ ошибиться цифрой. */}
            <a className={`${styles.phone} tapAction`} href={phoneHref(client.phone)}>
              {formatPhone(client.phone)}
            </a>
          </dd>
        </div>

        {client.address === null ? null : (
          <div className={styles.fact}>
            <dt>{texts.address}</dt>
            <dd>{client.address}</dd>
          </div>
        )}

        <div className={styles.fact}>
          <dt>{texts.sinceLabel}</dt>
          <dd>
            <time dateTime={client.createdAt}>{texts.date(client.createdAt)}</time>
          </dd>
        </div>
      </dl>

      {client.note === null ? null : <p className={styles.note}>{client.note}</p>}
    </Card>
  );
}
