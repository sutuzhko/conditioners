import Link from 'next/link';

import { reviewModerationContent as texts } from './content';
import { REVIEW_TABS, reviewsHref, type ReviewTab } from './model';
import styles from './ReviewTabs.module.css';

export interface ReviewTabsProps {
  /**
   * Открытая вкладка. Её разбирает страница на сервере — до чтения данных,
   * поэтому раздел приходит уже открытым на нужной (issue #340).
   *
   * У заготовки раздела открытой вкладки нет: `loading.tsx` параметров
   * адреса не получает, и подсветить он может только не ту.
   */
  readonly active?: ReviewTab | undefined;
}

/**
 * Вкладки модерации: «На модерации», «Опубликованные», «Отклонённые»,
 * «В архиве», «Все».
 *
 * 🔴 Обычные ссылки, а не состояние компонента: вкладка живёт в адресе,
 * ссылку на «На модерации» отправляют коллеге, а «назад» возвращает на
 * предыдущую вкладку (issue #339, #342). Своего JS у переключателя нет
 * вовсе — историю и переход делает браузер.
 *
 * 🔴 «В архиве» стоит вопреки макету (ADR-300, issue #514): он рисовался до
 * того, как стало ясно, что архив недостижим. Архивные не удаляются
 * (инвариант 7), значит их только больше, и добраться до отзыва, снятого
 * полгода назад, можно было лишь листая «Все» по восемь записей.
 */
export function ReviewTabs({ active }: ReviewTabsProps) {
  return (
    <nav className={styles.tabs} aria-label={texts.filterLabel}>
      {REVIEW_TABS.map((tab) => (
        <Link
          key={tab}
          className={[styles.tab, tab === active ? styles.active : null].filter(Boolean).join(' ')}
          href={reviewsHref(tab)}
          /* Прокрутка не сбрасывается наверх: вкладки сравнивают, стоя в
             середине списка (issue #342). */
          scroll={false}
          aria-current={tab === active ? 'page' : undefined}
        >
          {texts.tabTitle(tab)}
        </Link>
      ))}
    </nav>
  );
}
