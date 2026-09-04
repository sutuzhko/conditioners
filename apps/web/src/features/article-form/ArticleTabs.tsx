import Link from 'next/link';

import { articleFormContent as texts } from './content';
import { ARTICLE_TABS, articleEditHref, type ArticleTab } from './model';
import styles from './ArticleTabs.module.css';

export interface ArticleTabsProps {
  /** Идентификатор статьи: вкладка живёт в адресе именно этой статьи. */
  readonly id: string;
  /**
   * Открытая вкладка. Её разбирает страница на сервере — до чтения данных,
   * поэтому статья приходит уже открытой на нужной (issue #340).
   *
   * У заготовки открытой вкладки нет: `loading.tsx` параметров адреса не
   * получает, и подсветить он может только не ту.
   */
  readonly active?: ArticleTab | undefined;
}

/**
 * Вкладки статьи: «Текст», «SEO», «Публикация».
 *
 * 🔴 Обычные ссылки, а не состояние компонента: вкладка живёт в адресе,
 * ссылку на SEO отправляют коллеге, а «назад» возвращает на предыдущую
 * вкладку (issue #339, #342). Своего JS у переключателя нет вовсе.
 */
export function ArticleTabs({ id, active }: ArticleTabsProps) {
  return (
    <nav className={styles.tabs} aria-label={texts.tabsLabel}>
      {ARTICLE_TABS.map((tab) => (
        <Link
          key={tab}
          className={[styles.tab, tab === active ? styles.active : null].filter(Boolean).join(' ')}
          href={articleEditHref(id, tab)}
          /* Прокрутка не сбрасывается наверх: вкладки сравнивают, стоя в
             середине текста (issue #342). */
          scroll={false}
          aria-current={tab === active ? 'page' : undefined}
        >
          {texts.tabTitle(tab)}
        </Link>
      ))}
    </nav>
  );
}
