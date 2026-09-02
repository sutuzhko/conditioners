import { Skeleton } from '@/shared/ui';
import { adminShellContent as texts } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Настройки: шапка настоящая, три карточки конфигурации — заготовками той же
 * сетки (issue #334). Свой скелетон нужен потому, что общий файл группы
 * `(panel)` повторяет сводку, а не эту страницу.
 */
export default function SettingsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.settingsTitle}</h1>
        <p className={styles.lead}>{texts.settingsLead}</p>
      </header>

      <ul className={styles.cards}>
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index}>
            <Skeleton variant="block" className={styles.cardSkeleton} />
          </li>
        ))}
      </ul>
    </div>
  );
}
