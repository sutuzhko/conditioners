'use client';

import { useRouter } from 'next/navigation';

import { Alert, ButtonLink, Card, EmptyState, Table } from '@/shared/ui';

import { StaffRow } from './StaffRow';
import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import type { StaffApi, StaffDetails, StaffRowStats } from './model';
import styles from './StaffList.module.css';

export interface StaffListProps {
  readonly staff: readonly StaffDetails[];
  /** Действующий поиск: пустой список тогда объясняется иначе. */
  readonly query?: string | undefined;
  /**
   * Загрузка недели и деньги месяца по каждому. Считаются из нарядов, своего
   * поля в базе у загрузки нет (ADR-310, issue #629).
   */
  readonly stats?: ReadonlyMap<string, StaffRowStats> | undefined;
  readonly api?: StaffApi | undefined;
}

/**
 * Команда: таблица монтажников (issue #602, макет `Team.png`).
 *
 * 🔴 Заведение сюда не входит: оно ушло в окно с собственным адресом
 * (ADR-117). Форма, разворачивавшаяся над списком, уводила карточки вниз ровно
 * тогда, когда на них смотрят, — а список открывают, чтобы позвонить.
 *
 * Ниже 600px строки разворачиваются карточками (`variant="cards"`): восемь
 * колонок на телефоне не читаются вовсе.
 */
export function StaffList({ staff, stats, query = '', api = staffApi }: StaffListProps) {
  const router = useRouter();

  const installers = staff.filter((person) => person.role === 'installer');

  if (installers.length === 0) {
    /* 🔴 Пусто и «ничего не найдено» — разные состояния с противоположными
       шагами: у первого шаг «заведите первого», у второго «сбросьте поиск». */
    return (
      <Card as="section">
        {query === '' ? (
          <EmptyState icon="team" title={texts.emptyTitle}>
            {texts.emptyText}
          </EmptyState>
        ) : (
          <EmptyState
            icon="search"
            title={texts.emptyFound}
            action={
              <ButtonLink href="/admin/team" size="sm" variant="bordered">
                {texts.searchReset}
              </ButtonLink>
            }
          >
            {texts.emptyFoundText}
          </EmptyState>
        )}
      </Card>
    );
  }

  return (
    <div className={styles.list}>
      <Card as="section" padding="none" className={styles.card}>
        <Table variant="cards" label={texts.tableLabel} className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{texts.colStaff}</th>
              <th scope="col">{texts.colPhone}</th>
              <th scope="col">{texts.colLoad}</th>
              <th scope="col">{texts.colDone}</th>
              <th scope="col">{texts.colEarned}</th>
              <th scope="col">{texts.colDeductions}</th>
              <th scope="col">{texts.colAccess}</th>
              <th scope="col">
                <span className="srOnly">{texts.colActions}</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {installers.map((person) => (
              <StaffRow
                key={person.id}
                staff={person}
                api={api}
                stats={stats?.get(person.id)}
                onChanged={() => router.refresh()}
              />
            ))}
          </tbody>
        </Table>
      </Card>

      {/* 🔴 Заметки владельца закрыты сервером, а не скрытой кнопкой (CRM §6):
          плашка говорит это прямо, иначе владелец решает, что достаточно не
          показывать вкладку. */}
      <Alert tone="warning" title={texts.notesNoticeTitle}>
        {texts.notesNoticeText}
      </Alert>
    </div>
  );
}
