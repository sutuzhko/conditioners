import { profileFormContent as texts } from '@/features/profile-form';
import { FieldsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/** Профиль: шапка настоящая, карточки формы — заготовками (issue #334). */
export default function ProfileLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.skeleton}>
        <div className={styles.column}>
          <FieldsSkeleton fields={4} />
          <FieldsSkeleton fields={3} />
        </div>

        <div className={styles.column}>
          <FieldsSkeleton fields={3} />
          <FieldsSkeleton fields={2} />
        </div>
      </div>
    </div>
  );
}
