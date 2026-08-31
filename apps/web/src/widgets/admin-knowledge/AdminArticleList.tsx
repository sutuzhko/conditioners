import Link from 'next/link';

import { Badge, Card, EmptyState, Table } from '@/shared/ui';

import { adminKnowledgeContent as texts } from './content';
import styles from './AdminArticleList.module.css';

/** Строка списка: ровно то, что видно в таблице. */
export type ArticleRow = {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  /** ISO-день: форматируется при показе. */
  readonly date: string;
  readonly minutes: number;
  readonly published: boolean;
};

export interface AdminArticleListProps {
  /** Все статьи, включая черновики: черновик — не отсутствующая статья. */
  readonly articles: readonly ArticleRow[];
}

/** Список статей базы знаний. */
export function AdminArticleList({ articles }: AdminArticleListProps) {
  if (articles.length === 0) {
    return (
      <Card as="section">
        <EmptyState icon="knowledge" title={texts.emptyTitle}>
          {texts.emptyText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card as="section" padding="none">
      <Table label={texts.title} variant="cards">
        <thead>
          <tr role="row">
            <th scope="col">{texts.colTitle}</th>
            <th scope="col">{texts.colCategory}</th>
            <th scope="col">{texts.colDate}</th>
            <th scope="col">{texts.colMinutes}</th>
            <th scope="col">{texts.colPublished}</th>
            <th scope="col">
              <span className="srOnly">{texts.edit}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id} role="row">
              <td className={styles.name} role="cell" data-label={texts.colTitle}>
                {article.title}
              </td>
              <td role="cell" data-label={texts.colCategory}>
                {article.category}
              </td>
              <td className={styles.date} role="cell" data-label={texts.colDate}>
                {texts.date(article.date)}
              </td>
              <td className={styles.minutes} role="cell" data-label={texts.colMinutes}>
                {texts.minutes(article.minutes)}
              </td>
              <td role="cell" data-label={texts.colPublished}>
                <Badge variant={article.published ? 'success' : 'neutral'}>
                  {article.published ? texts.published : texts.draft}
                </Badge>
              </td>
              <td role="cell">
                <Link
                  className={styles.edit}
                  href={{ pathname: `/admin/knowledge/${article.id}` }}
                  aria-label={texts.editLabel(article.title)}
                >
                  {texts.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
