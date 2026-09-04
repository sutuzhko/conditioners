import { articleFormContent as texts } from './content';
import type { SerpSnippet } from './serp';
import styles from './SerpPreview.module.css';

export interface SerpPreviewProps {
  readonly snippet: SerpSnippet;
}

/**
 * Живое превью выдачи.
 *
 * 🔴 Показывает ровно то, что соберёт страница статьи (`serp.ts`): владелец
 * правит заголовок, глядя на результат, а не на поле. Пустые места названы
 * словами — пустой прямоугольник читается как поломка, а не как «ещё не
 * написано».
 */
export function SerpPreview({ snippet }: SerpPreviewProps) {
  return (
    <div className={styles.card}>
      <p className={styles.crumbs}>{snippet.crumbs}</p>

      <p
        className={[styles.title, snippet.title.trim() === '' ? styles.empty : null]
          .filter(Boolean)
          .join(' ')}
      >
        {snippet.title.trim() === '' ? texts.seoPreviewEmptyTitle : snippet.title}
      </p>

      <p
        className={[styles.description, snippet.description.trim() === '' ? styles.empty : null]
          .filter(Boolean)
          .join(' ')}
      >
        {snippet.description.trim() === '' ? texts.seoPreviewEmptyDescription : snippet.description}
      </p>
    </div>
  );
}
