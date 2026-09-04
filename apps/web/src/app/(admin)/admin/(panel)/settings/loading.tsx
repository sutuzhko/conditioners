import { Skeleton } from '@/shared/ui';
import { adminShellContent as shell } from '@/widgets/admin-shell';

import styles from './page.module.css';
import { settingsPageContent as texts } from './content';

/**
 * Настройки: шапка настоящая, карточки конфигурации — заготовками той же
 * сетки (issue #334). Свой скелетон нужен потому, что общий файл группы
 * `(panel)` повторяет сводку, а не эту страницу.
 *
 * Плашки о незаполненных данных здесь нет: она зависит от данных, а заготовка
 * обязана повторять одну раскладку — иначе после прихода данных карточки
 * уедут вниз на её высоту (ADR-241).
 */
export default function SettingsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{shell.settingsTitle}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ul className={styles.cards}>
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <Skeleton variant="block" className={styles.cardSkeleton} />
          </li>
        ))}
      </ul>
    </div>
  );
}
