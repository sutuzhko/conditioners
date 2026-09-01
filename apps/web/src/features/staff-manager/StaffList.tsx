'use client';

import { useRouter } from 'next/navigation';

import { Card, EmptyState } from '@/shared/ui';

import { StaffCardView } from './StaffCardView';
import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import type { StaffApi, StaffDetails } from './model';
import styles from './StaffList.module.css';

export interface StaffListProps {
  readonly staff: readonly StaffDetails[];
  readonly api?: StaffApi | undefined;
}

/**
 * Команда: список монтажников.
 *
 * 🔴 Заведение сюда не входит: оно ушло в окно с собственным адресом
 * (ADR-117). Форма, разворачивавшаяся над списком, уводила карточки вниз ровно
 * тогда, когда на них смотрят, — а список открывают, чтобы позвонить.
 */
export function StaffList({ staff, api = staffApi }: StaffListProps) {
  const router = useRouter();

  const installers = staff.filter((person) => person.role === 'installer');

  if (installers.length === 0) {
    return (
      <Card as="section">
        <EmptyState icon="team" title={texts.emptyTitle}>
          {texts.emptyText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className={styles.list}>
      {installers.map((person) => (
        <StaffCardView
          key={person.id}
          staff={person}
          api={api}
          onChanged={() => router.refresh()}
        />
      ))}
    </div>
  );
}
