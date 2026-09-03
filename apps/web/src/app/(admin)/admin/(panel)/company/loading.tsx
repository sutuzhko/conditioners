import { SETTINGS_GROUPS } from '@/features/settings-form';
import { FieldsSkeleton } from '@/widgets/admin-shell';

import { companyPageContent as texts } from './content';
import styles from './page.module.css';
import { SettingsToc } from './SettingsToc';

/**
 * Данные компании: шапка и оглавление настоящие — они не зависят от данных, —
 * группы полей заготовками (issue #334).
 */
export default function CompanyLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <SettingsToc
        label={texts.tocLabel}
        groups={SETTINGS_GROUPS.map((group) => ({ key: group.key, title: group.title }))}
      />

      <div className={styles.groups}>
        <FieldsSkeleton fields={6} />
        <FieldsSkeleton fields={4} />
      </div>
    </div>
  );
}
