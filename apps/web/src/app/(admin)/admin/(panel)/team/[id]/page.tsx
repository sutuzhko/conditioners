import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  InstallerNotes,
  StaffAccountForm,
  staffManagerContent as texts,
  staffTitle,
} from '@/features/staff-manager';
import { requireOwnerPage } from '@/server/guards';
import { findById, listNotes } from '@/server/repo/admin-users';

import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const staff = await findById(id);

  return { title: staff === null ? texts.title : staffTitle(staff) };
}

/** Карточка монтажника: аккаунт и заметки владельца. */
export default async function AdminTeamMemberPage({ params }: PageProps) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const { id } = await params;

  const [staff, notes] = await Promise.all([findById(id), listNotes(id)]);
  if (staff === null) notFound();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/team' }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{staffTitle(staff)}</h1>
        <p className={styles.meta}>
          <span className={styles.login}>@{staff.login}</span>
          <span>{texts.since(staff.createdAt)}</span>
          <span>{texts.lastLogin(staff.lastLoginAt)}</span>
        </p>
      </header>

      <StaffAccountForm staff={staff} />
      <InstallerNotes staffId={staff.id} notes={notes} />
    </div>
  );
}
