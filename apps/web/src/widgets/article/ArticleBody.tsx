import type { ReactNode } from 'react';
import type { ArticleBlock, InlineNode } from '@/entities/article/model';

import { articleOutline } from './outline';
import styles from './ArticleBody.module.css';

export interface ArticleBodyProps {
  /** Дерево блоков от `parseArticleBody` — разбирает домен, рисует UI. */
  blocks: readonly ArticleBlock[];
  className?: string | undefined;
}

/** `**жирный**` — единственное инлайн-оформление мини-формата (PROJECT §2.7). */
function inline(nodes: readonly InlineNode[]): ReactNode[] {
  return nodes.map((node, i) =>
    node.kind === 'strong' ? (
      <strong key={i} className={styles.strong}>
        {node.text}
      </strong>
    ) : (
      // обычный текст возвращается строкой: лишний span ничего не значит
      // ни для верстки, ни для поиска, а в разметке статьи его видно
      node.text
    ),
  );
}

/**
 * Текст статьи.
 *
 * Серверный компонент без единого «опасного» вставления разметки: приходит
 * дерево блоков, а не строка HTML, поэтому текст, вставленный владельцем из
 * Word, физически не может принести в вёрстку чужие теги.
 *
 * `##` становится `h2`, `###` — `h3`; единственный `h1` на странице —
 * заголовок статьи, и он живёт выше (инвариант 4).
 */
export function ArticleBody({ blocks, className }: ArticleBodyProps) {
  const { blocks: outlined } = articleOutline(blocks);
  const classes = [styles.body, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {outlined.map((block, i) => {
        if (block.kind === 'heading') {
          const Heading = block.level === 2 ? 'h2' : 'h3';
          return (
            <Heading key={i} id={block.id} className={styles[Heading]}>
              {inline(block.content)}
            </Heading>
          );
        }

        if (block.kind === 'list') {
          return (
            <ul key={i} className={styles.list}>
              {block.items.map((item, j) => (
                <li key={j} className={styles.item}>
                  {inline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === 'callout') {
          return (
            <aside key={i} className={styles.callout}>
              <p className={styles.calloutText}>{inline(block.content)}</p>
            </aside>
          );
        }

        return (
          <p key={i} className={styles.paragraph}>
            {inline(block.content)}
          </p>
        );
      })}
    </div>
  );
}
