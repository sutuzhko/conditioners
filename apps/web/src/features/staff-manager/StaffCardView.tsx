'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge, Button, Card } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import type { StaffApi, StaffCard } from './model';
import { staffTitle } from './model';
import styles from './StaffCardView.module.css';

export interface StaffCardViewProps {
  readonly staff: StaffCard;
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
