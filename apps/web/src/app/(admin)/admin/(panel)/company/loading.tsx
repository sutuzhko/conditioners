import { FieldsSkeleton } from '@/widgets/admin-shell';

import { companyPageContent as texts } from './content';
import styles from './page.module.css';

/**
 * Данные компании: шапка настоящая — она не зависит от данных, — а полоса
 * готовности и группы полей заготовками (issue #334).
 *
 * 🔴 Полоса готовности не рисуется цифрой на время загрузки: «0 %» на месте
 * будущих «82 %» — это выдуманный факт, который владелец успевает прочитать.
 */
export default function CompanyLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.groups}>
        <FieldsSkeleton fields={6} />
        <FieldsSkeleton fields={4} />
      </div>
    </div>
  );
}
