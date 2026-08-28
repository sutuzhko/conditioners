'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Card } from '@/shared/ui';

import { StaffCardView } from './StaffCardView';
import { StaffCreateForm } from './StaffCreateForm';
import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import type { StaffApi, StaffDetails } from './model';
import styles from './StaffList.module.css';

export interface StaffListProps {
  readonly staff: readonly StaffDetails[];
  readonly api?: StaffApi | undefined;
}

/**
 * Команда: список монтажников и форма заведения нового.
 *
 * Форма свёрнута по умолчанию — заводят человека раз в полгода, а список
 * открывают, чтобы позвонить.
 */
export function StaffList({ staff, api = staffApi }: StaffListProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const installers = staff.filter((person) => person.role === 'installer');

  return (
    <div className={styles.list}>
      <div className={styles.top}>
        <Button
          type="button"
          variant={adding ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setAdding((open) => !open)}
        >
          {adding ? texts.addClose : texts.addOpen}
        </Button>
      </div>

      {adding ? (
        <StaffCreateForm
          api={api}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}

      {installers.length === 0 ? (
        <Card as="section" className={styles.empty}>
          <h2 className={styles.emptyTitle}>{texts.emptyTitle}</h2>
          <p className={styles.emptyText}>{texts.emptyText}</p>
        </Card>
      ) : (
        installers.map((person) => (
          <StaffCardView
            key={person.id}
            staff={person}
            api={api}
            onChanged={() => router.refresh()}
          />
        ))
      )}
    </div>
  );
}
