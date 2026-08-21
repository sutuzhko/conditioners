import Link from 'next/link';

import { Badge, Card, Table } from '@/shared/ui';

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
      <Card as="section" className={styles.empty}>
        <h2 className={styles.emptyTitle}>{texts.emptyTitle}</h2>
        <p className={styles.emptyText}>{texts.emptyText}</p>
      </Card>
    );
  }

  return (
    <Card as="section" padding="none">
      <Table label={texts.title} variant="sticky" minWidth="680px">
        <thead>
          <tr>
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
            <tr key={article.id}>
              <td className={styles.name}>{article.title}</td>
              <td>{article.category}</td>
              <td className={styles.date}>{texts.date(article.date)}</td>
              <td className={styles.minutes}>{texts.minutes(article.minutes)}</td>
              <td>
                <Badge variant={article.published ? 'success' : 'neutral'}>
                  {article.published ? texts.published : texts.draft}
                </Badge>
              </td>
              <td>
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
