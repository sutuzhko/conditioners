import { activityActionTitle, activityEntityTitle } from '@/entities/activity/model';
import { formatDateTime } from '@/shared/lib/format';
import { Card, EmptyState, Pager, Table } from '@/shared/ui';

import { activityLogContent as texts } from './content';
import { ACTIVITY_PATH, type ActivityEventView, type ActivityPage } from './model';
import styles from './ActivityList.module.css';

export interface ActivityListProps {
  readonly journal: ActivityPage;
}

/**
 * Журнал событий списком: кто, когда, что сделал и над чем.
 *
 * 🔴 Действий над строкой здесь нет, и это не пробел раздела (ADR-307 §4), а
 * само устройство журнала: запись создаёт система, правится у неё одна пометка
 * человека, а удаление бывает только чисткой за период (ADR-345). Кнопка
 * «Изменить» у события означала бы журнал, в который можно дописать строку, —
 * то есть журнал, доказывающий ровно столько же, сколько пустой. Пометка
 * приходит фазой 5, чистка — фазой 5, отбор и лента в карточке сущности —
 * фазой 4; issue на «раздел без действий» заводить не нужно.
 *
 * Серверный компонент: журнал только показывают, а листают адресом.
 */
export function ActivityList({ journal }: ActivityListProps) {
  if (journal.items.length === 0) {
    return (
      <Card as="section">
        {/* Пустой журнал — это состояние новой установки, а не сбой и не
            результат отбора: отбирать пока нечем (он приходит фазой 4), и
            выхода из пустоты здесь нет — она проходит сама. */}
        <EmptyState icon="overview" title={texts.emptyTitle}>
          {texts.emptyText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card as="section" padding="none" className={styles.board}>
      {/* `cards` требует подписи в каждой ячейке и явных ролей: раскладка
          карточками сделана через `display: block`, а он снимает с таблицы её
          семантику (см. комментарий в Table.tsx). */}
      <Table variant="cards" label={texts.tableLabel}>
        <thead>
          <tr role="row">
            <th scope="col">{texts.colWhen}</th>
            <th scope="col">{texts.colWho}</th>
            <th scope="col">{texts.colAction}</th>
            <th scope="col">{texts.colEntity}</th>
          </tr>
        </thead>
        <tbody>
          {journal.items.map((event) => (
            <Row event={event} key={event.id} />
          ))}
        </tbody>
      </Table>

      <div className={styles.foot}>
        <Pager
          page={journal.page}
          pages={journal.pages}
          basePath={ACTIVITY_PATH}
          label={texts.pagerLabel}
          numbers
        />
      </div>
    </Card>
  );
}

/**
 * Чем подписан автор, когда имени нет.
 *
 * 🔴 Два состояния, а не одно (ADR-345, решение о роде автора). «Система» —
 * автора не было по природе: заявка с сайта, уборка расписанием, кнопка в
 * Telegram. «Учётная запись удалена» — человек действовал, а учётки больше
 * нет: `SetNull` обнулил ссылку, событие осталось. Свести их к одному слову
 * значит соврать в одном из двух случаев.
 */
function authorOf(event: ActivityEventView): string {
  if (event.actor !== null) return event.actor.name;

  return event.actorKind === 'user' ? texts.authorGone : texts.noAuthor;
}

/**
 * Одно событие.
 *
 * 🔴 Прочерка в колонке «Кто» нет ни в одном случае: он читался бы как «данные
 * потеряли», хотя потеряно самое большее имя, а само действие — вот оно.
 */
function Row({ event }: { readonly event: ActivityEventView }) {
  return (
    <tr role="row">
      <td className={styles.when} data-label={texts.colWhen} role="cell">
        <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
      </td>
      <td
        className={styles.who}
        data-label={texts.colWho}
        data-system={event.actor === null ? '' : undefined}
        role="cell"
      >
        {authorOf(event)}
      </td>
      <td data-label={texts.colAction} role="cell">
        {activityActionTitle(event.action)}
      </td>
      <td className={styles.entity} data-label={texts.colEntity} role="cell">
        {activityEntityTitle(event.entity)}
      </td>
    </tr>
  );
}
