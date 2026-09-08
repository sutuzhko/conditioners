import { Skeleton } from '@/shared/ui';
import { adminShellContent as shell, settingsSectionsFor } from '@/widgets/admin-shell';

import styles from './page.module.css';
import { settingsPageContent as texts } from './content';

/**
 * Карточки, которых нет в списке разделов конфигурации: справочник
 * характеристик живёт по адресу внутри каталога (ADR-094, ADR-283), а на этой
 * странице стоит указателем.
 */
const SELF_STANDING_CARDS = 1;

/**
 * Сколько карточек рисует страница.
 *
 * 🔴 Считается по тому же списку, а не стоит цифрой. Цифра здесь уже
 * разошлась: раздел журнала, добавленный в конфигурацию (issue #815), сделал
 * карточек пять при четырёх заготовках — сетка перестраивалась на лишнюю
 * строку ровно в момент, когда данные приезжали. Роль всегда владелец:
 * страницу закрывает `requireOwnerPage()`.
 */
const CARDS = settingsSectionsFor('owner').length + SELF_STANDING_CARDS;

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
        {Array.from({ length: CARDS }, (_, index) => (
          <li key={index}>
            <Skeleton variant="block" className={styles.cardSkeleton} />
          </li>
        ))}
      </ul>
    </div>
  );
}
