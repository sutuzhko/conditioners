'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge, Button, Card } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import type { StaffApi, StaffDetails } from './model';
import { employmentTitle, isSelfEmployedWithoutInn, staffTitle } from './model';
import styles from './StaffCardView.module.css';

export interface StaffCardViewProps {
  readonly staff: StaffDetails;
  readonly api: StaffApi;
  readonly onChanged?: (() => void) | undefined;
}

/**
 * Монтажник в списке команды.
 *
 * Переключатель доступа стоит прямо в списке: закрыть доступ уволившемуся
 * нужно немедленно, и заходить ради этого в карточку — лишний шаг.
 */
export function StaffCardView({ staff, api, onChanged }: StaffCardViewProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const toggle = async (): Promise<void> => {
    setBusy(true);
    setMessage('');

    const result = await api.update(staff.id, { active: !staff.active });

    setBusy(false);
    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  return (
    <Card as="article" className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.name}>{staffTitle(staff)}</h2>
        <span className={styles.login}>@{staff.login}</span>
        <Badge variant={staff.active ? 'success' : 'neutral'}>
          {staff.active ? texts.active : texts.inactive}
        </Badge>

        {/* Оформление рядом с доступом: обе плашки отвечают на вопрос «что с
            этим человеком можно», просто одна про вход, вторая про деньги. */}
        <Badge variant={staff.employment === null ? 'warning' : 'accent'}>
          {staff.employment === null ? texts.employmentUnset : employmentTitle(staff.employment)}
        </Badge>
      </div>

      <dl className={styles.facts}>
        {staff.phone === null ? null : (
          <div className={styles.fact}>
            <dt>{texts.phone}</dt>
            <dd>
              <a href={`tel:${staff.phone.replace(/\D/g, '')}`}>{staff.phone}</a>
            </dd>
          </div>
        )}
        <div className={styles.fact}>
          <dt>Доступ</dt>
          <dd>{texts.lastLogin(staff.lastLoginAt)}</dd>
        </div>
      </dl>

      {/* Пустое оформление — не мелочь оформления карточки: пока его нет,
          наряд считает, что уменьшать вознаграждение нельзя. Владелец должен
          прочитать это, не заходя в карточку. */}
      {staff.employment === null ? (
        <p className={styles.notice}>{texts.employmentUnsetHint}</p>
      ) : null}

      {/* 🔴 Самозанятый без ИНН: статус на дату выплаты проверить нечем, а
          слетевший статус оплачивает компания (PROJECT §5.4). Предупреждение
          видно из списка — иначе владелец узнает об этом в день выплаты. */}
      {isSelfEmployedWithoutInn(staff.employment, staff.inn) ? (
        <p className={styles.notice}>{texts.innMissing}</p>
      ) : null}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => void toggle()}
        >
          {staff.active ? texts.disable : texts.enable}
        </Button>

        <Link className={styles.open} href={{ pathname: `/admin/team/${staff.id}` }}>
          {texts.open} →
        </Link>
      </div>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </Card>
  );
}
