import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ProfileForm, profileFormContent as texts } from '@/features/profile-form';
import { requirePage } from '@/server/guards';
import { findById } from '@/server/repo/admin-users';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/** Свой профиль. Раздел есть у обеих ролей — это единственное общее место. */
export default async function AdminProfilePage() {
  const session = await requirePage();

  const me = await findById(session.userId);
  if (me === null) redirect('/admin/login');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ProfileForm me={me} />
    </div>
  );
}
