import type { Metadata } from 'next';

import { SETTINGS_GROUPS, SettingsForm, toGroupValue } from '@/features/settings-form';
import { requireOwnerPage } from '@/server/guards';
import { getAll } from '@/server/repo/settings';

import styles from './page.module.css';
import { companyPageContent as texts } from './content';
import { SettingsToc } from './SettingsToc';

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
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const settings = await getAll();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      {/* Оглавление: групп тринадцать, и прокручивать их в поисках нужной —
          основная работа на этой странице. */}
      <SettingsToc
        label={texts.tocLabel}
        groups={SETTINGS_GROUPS.map((group) => ({ key: group.key, title: group.title }))}
      />

      <div className={styles.groups}>
        {SETTINGS_GROUPS.map((group) => {
          const value = toGroupValue(settings[group.key]);

          return (
            <div className={styles.group} id={group.key} key={group.key}>
              <SettingsForm group={group} value={value} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
