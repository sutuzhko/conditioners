import { articleContent as t } from './content';
import type { ArticleHeading } from './model';
import styles from './ArticleToc.module.css';

export interface ArticleTocProps {
  headings: readonly ArticleHeading[];
}

/**
 * Оглавление статьи — обязательный элемент статьи по docs/SEO.md §7.
 *
 * Собирается из заголовков второго уровня самого текста, поэтому не может
 * разойтись с ним: владелец переименовал раздел — переименовался и пункт.
 * Подписью служит обычный абзац, а не заголовок: в оглавлении нет своего
 * содержания, и в структуре заголовков страницы ему не место.
 */
export function ArticleToc({ headings }: ArticleTocProps) {
  if (headings.length === 0) return null;

  return (
    <nav className={styles.toc} aria-label={t.tocLabel}>
      <p className={styles.title}>{t.tocTitle}</p>
      <ol className={styles.list}>
        {headings.map((heading) => (
          <li key={heading.id} className={styles.item}>
            <a className={styles.link} href={`#${heading.id}`}>
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
