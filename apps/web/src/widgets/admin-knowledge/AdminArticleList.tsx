import { ArticleRowRemove } from '@/features/article-form';
import {
  Badge,
  Card,
  EmptyState,
  Icon,
  Table,
  TableAction,
  TableActionLink,
  TableActions,
} from '@/shared/ui';

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
  /** Адрес статьи на сайте: по нему открывается «Смотреть». */
  readonly slug: string;
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
            {/* Имя колонки читалке нужно, а на экране оно только повторяет
                три подписанных значка под собой. */}
            <th scope="col">
              <span className="srOnly">{texts.colActions}</span>
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
                {/* 🔴 Открыть · править · убрать — один набор на все списки
                    панели (issue #575). Удаление красное и спрашивает
                    подтверждение диалогом кита (ADR-113). */}
                <TableActions label={texts.rowActions(article.title)}>
                  {article.published ? (
                    <TableActionLink
                      tone="open"
                      label={texts.viewLabel(article.title)}
                      icon={<Icon name="eye" size={16} />}
                      href={{ pathname: `/knowledge/${article.slug}` }}
                    />
                  ) : (
                    <TableAction
                      tone="open"
                      label={texts.viewDraftLabel(article.title)}
                      icon={<Icon name="eye" size={16} />}
                      disabled
                    />
                  )}

                  <TableActionLink
                    tone="edit"
                    label={texts.editLabel(article.title)}
                    icon={<Icon name="edit" size={16} />}
                    href={{ pathname: `/admin/knowledge/${article.id}` }}
                  />

                  <ArticleRowRemove id={article.id} title={article.title} />
                </TableActions>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
