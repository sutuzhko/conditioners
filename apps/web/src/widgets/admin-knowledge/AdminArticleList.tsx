import { ArticleRowRemove } from '@/features/article-form';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  Table,
  TableAction,
  TableActionLink,
  TableActions,
  TableRow,
  TableRowLink,
  tableAboveClassName,
} from '@/shared/ui';

import { adminKnowledgeContent as texts } from './content';
import { KNOWLEDGE_PATH } from './model';
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
  /** Длина текста в знаках: по ней видно, написана статья или начата. */
  readonly chars: number;
  /** Обложка; `null` — в листинге на сайте статья выйдет без картинки. */
  readonly cover: string | null;
};

export interface AdminArticleListProps {
  /** Все статьи, включая черновики: черновик — не отсутствующая статья. */
  readonly articles: readonly ArticleRow[];
  /**
   * Список пуст из-за отбора, а не потому, что статей нет вовсе.
   *
   * Два пустых состояния с противоположными шагами: в одном надо написать
   * статью, в другом — снять фильтр (issue #335).
   */
  readonly filtered?: boolean | undefined;
}

/**
 * Список статей базы знаний.
 *
 * 🔴 Строка нажимается целиком и ведёт в правку статьи (issue #743). До этого
 * заголовок был обычным текстом, и открыть статью можно было одним кругом
 * 32×32 у правого края. Приём китовый (`TableRow`, `TableRowLink`, ADR-347);
 * над перекрытием поднята только колонка действий — «смотреть на сайте» и
 * «удалить» обязаны делать своё, а не открывать правку.
 *
 * 🔴 Под заголовком — адрес статьи и длина её текста (issue #614). Слаг задаёт
 * владелец, и на него завязаны разосланные ссылки; число знаков отвечает на
 * второй вопрос списка — статья написана или начата, — а текст на две тысячи
 * знаков в выдаче не живёт. Отсутствие обложки приписывается там же: без неё
 * статья выйдет в листинг сайта без картинки.
 */
export function AdminArticleList({ articles, filtered = false }: AdminArticleListProps) {
  if (articles.length === 0) {
    return (
      <Card as="section">
        {filtered ? (
          <EmptyState
            icon="search"
            title={texts.emptyFilteredTitle}
            action={
              <ButtonLink href={{ pathname: KNOWLEDGE_PATH }} size="sm" variant="bordered">
                {texts.emptyFilteredAction}
              </ButtonLink>
            }
          >
            {texts.emptyFilteredText}
          </EmptyState>
        ) : (
          <EmptyState icon="knowledge" title={texts.emptyTitle}>
            {texts.emptyText}
          </EmptyState>
        )}
      </Card>
    );
  }

  return (
    <Card as="section" padding="none">
      <Table label={texts.title} variant="cards">
        <thead>
          <tr role="row">
            {/* Доли ширины стоят только в шапке: ниже 600px кит раскладывает
                ячейки карточками, и `width` на ячейке распёрла бы карточку
                шире экрана. Слабину ряда забирает заголовок статьи — он
                длиннее всех, и ломать его на три строки ради колонки «Чтение»
                с четырьмя знаками незачем (макет `Knowledge`). */}
            <th scope="col">{texts.colTitle}</th>
            <th className={styles.colCategory} scope="col">
              {texts.colCategory}
            </th>
            <th className={styles.colDate} scope="col">
              {texts.colDate}
            </th>
            <th className={styles.colMinutes} scope="col">
              {texts.colMinutes}
            </th>
            <th className={styles.colState} scope="col">
              {texts.colPublished}
            </th>
            {/* Имя колонки читалке нужно, а на экране оно только повторяет
                три подписанных значка под собой. */}
            <th className={styles.colActions} scope="col">
              <span className="srOnly">{texts.colActions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <TableRow key={article.id}>
              <td className={styles.titleCell} role="cell" data-label={texts.colTitle}>
                {/* 🔴 Заголовок и подпись — один узел, а не два. Ниже 600px кит
                    раскладывает ячейку карточкой с `display: flex`, и двумя
                    детьми они встали бы в строку по разные стороны подписи
                    поля (тот же приём, что у названия модели в каталоге). */}
                <span className={styles.names}>
                  <TableRowLink
                    className={`${styles.name} tapAction`}
                    href={{ pathname: `/admin/knowledge/${article.id}` }}
                    label={texts.rowLabel(article.title)}
                  >
                    {article.title}
                  </TableRowLink>
                  {/* Подпись строки: адрес, длина текста и — только когда её
                      нет — отсутствие обложки. Точками через `·`, как в
                      остальных списках панели. */}
                  <span className={styles.sub}>
                    <span className={styles.slug}>{texts.slugPath(article.slug)}</span>
                    <span aria-hidden="true"> · </span>
                    <span className={styles.chars}>{texts.characters(article.chars)}</span>
                    {article.cover === null ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className={styles.warn}>{texts.noCover}</span>
                      </>
                    ) : null}
                  </span>
                </span>
              </td>
              <td role="cell" data-label={texts.colCategory}>
                <Badge variant="neutral" wrap>
                  {article.category}
                </Badge>
              </td>
              <td className={styles.date} role="cell" data-label={texts.colDate}>
                {texts.date(article.date)}
              </td>
              <td className={styles.minutes} role="cell" data-label={texts.colMinutes}>
                {texts.minutes(article.minutes)}
              </td>
              <td role="cell" data-label={texts.colPublished}>
                <Badge variant={article.published ? 'success' : 'neutral'} dot>
                  {article.published ? texts.published : texts.draft}
                </Badge>
              </td>
              <td role="cell">
                {/* 🔴 «Править» из ряда убрано (issue #866): круг вёл по тому
                    же адресу, что и вся строка, — «глаз делает то же самое,
                    что и клик», слова владельца. Вторая ссылка на тот же
                    адрес не добавляла ни одного адреса, зато удваивала список
                    целей у читалки и занимала тап-зону на телефоне (ADR-347).
                    Набор #575 сокращается до тех действий, у которых своя
                    цель: посмотреть на сайте и убрать. */}
                <TableActions
                  className={tableAboveClassName()}
                  label={texts.rowActions(article.title)}
                >
                  {article.published ? (
                    <TableActionLink
                      tone="open"
                      label={texts.viewLabel(article.title)}
                      icon={<Icon name="eye" size={16} />}
                      href={{ pathname: `/knowledge/${article.slug}` }}
                    />
                  ) : (
                    /* 🔴 У черновика адреса на сайте нет — страница отдаёт 404
                       (issue #615). Действие не исчезает из ряда, а стоит
                       отключённым и называет причину: пропавшая кнопка
                       заставляла бы гадать, куда она делась. */
                    <TableAction
                      tone="open"
                      label={texts.viewDraftLabel(article.title)}
                      icon={<Icon name="eye" size={16} />}
                      disabled
                    />
                  )}

                  <ArticleRowRemove id={article.id} title={article.title} />
                </TableActions>
              </td>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
