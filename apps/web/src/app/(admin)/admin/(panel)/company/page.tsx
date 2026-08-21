import type { Metadata } from 'next';

import { SETTINGS_GROUPS, SettingsForm, type GroupValue } from '@/features/settings-form';
import { getAll } from '@/server/repo/settings';

import styles from './page.module.css';
import { companyPageContent as texts } from './content';

export const metadata: Metadata = { title: 'Компания' };

/* Страница читает настройки при каждом заходе: она же их и правит. */
export const dynamic = 'force-dynamic';

/**
 * Данные компании — всё, что на сайте нельзя зашить в код (инвариант 8).
 *
 * Группы стоят отдельными формами и сохраняются независимо: контракт — `PUT`
 * на группу, и правка телефона не должна ждать, пока владелец допишет
 * условия гарантии.
 */
export default async function AdminCompanyPage() {
  const settings = await getAll();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      {/* Оглавление: групп двенадцать, и прокручивать их в поисках нужной —
          основная работа на этой странице. */}
      <nav className={styles.toc} aria-label={texts.tocLabel}>
        {SETTINGS_GROUPS.map((group) => (
          <a className={styles.tocLink} key={group.key} href={`#${group.key}`}>
            {group.title}
          </a>
        ))}
      </nav>

      <div className={styles.groups}>
        {SETTINGS_GROUPS.map((group) => {
          const stored = settings[group.key];
          const value: GroupValue =
            typeof stored === 'object' && stored !== null && !Array.isArray(stored)
              ? (stored as GroupValue)
              : {};

          return (
            <div id={group.key} key={group.key}>
              <SettingsForm group={group} value={value} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
