import { profileFormContent as texts } from '@/features/profile-form';
import { FieldsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Профиль: шапка настоящая, поля формы — заготовками (issue #334). */
export default function ProfileLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <FieldsSkeleton fields={5} />
    </div>
  );
}
