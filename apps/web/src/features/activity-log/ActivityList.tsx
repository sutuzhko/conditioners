import {
  activityActionTitle,
  activityEntityTitle,
  activityFilterOn,
  activityFilterQuery,
  EMPTY_ACTIVITY_FILTER,
  type ActivityFilter,
} from '@/entities/activity/model';
import { formatDateTime } from '@/shared/lib/format';
import { Card, EmptyState, Pager, Table } from '@/shared/ui';

import { activityLogContent as texts } from './content';
import { ACTIVITY_PATH, type ActivityEventView, type ActivityPage } from './model';
import styles from './ActivityList.module.css';

export interface ActivityListProps {
  readonly journal: ActivityPage;
  /**
   * С каким отбором собрана страница. Нужен двум вещам: разбивка несёт его за
   * собой (иначе вторая страница найденного показывает весь журнал), а пустой
   * результат обязан сказать, отсёк ли записи отбор.
   */
  readonly filter?: ActivityFilter | undefined;
}

/**
 * Журнал событий списком: кто, когда, что сделал и над чем.
 *
 * 🔴 Действий над строкой здесь нет, и это не пробел раздела (ADR-307 §4), а
 * само устройство журнала: запись создаёт система, правится у неё одна пометка
 * человека, а удаление бывает только чисткой за период (ADR-345). Кнопка
 * «Изменить» у события означала бы журнал, в который можно дописать строку, —
 * то есть журнал, доказывающий ровно столько же, сколько пустой.
 *
 * Серверный компонент: журнал только показывают, а листают и отбирают адресом.
 */
export function ActivityList({ journal, filter = EMPTY_ACTIVITY_FILTER }: ActivityListProps) {
  if (journal.items.length === 0) {
    /* 🔴 Пустой журнал и пустой результат отбора — разные новости с
       противоположными шагами (issue #335). Журнал новой установки пуст сам
       по себе, и «снимите фильтр» там ничего не чинит; пустой результат
       отбора, наоборот, снимается ровно им. */
    const filtered = activityFilterOn(filter);

    return (
      <Card as="section">
        <EmptyState icon="overview" title={filtered ? texts.notFoundTitle : texts.emptyTitle}>
          {filtered ? texts.notFoundText : texts.emptyText}
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
          query={activityFilterQuery(filter)}
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
 *
 * Пометка человека стоит под действием, а не отдельной колонкой: она бывает у
 * одной строки из сотни, и пустая колонка ради неё съела бы ширину у тех
 * четырёх, которые нужны всегда.
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
        {event.note === null ? null : (
          <p className={styles.note}>
            {/* Дата пометки скрыта от глаза и звучит вслух: в строке она
                занимала бы место, а без неё непонятно, свежая ли пометка. */}
            <span className="srOnly">
              {event.noteUpdatedAt === null
                ? texts.noteLabel
                : texts.noteAt(formatDateTime(event.noteUpdatedAt))}
            </span>
            {event.note}
          </p>
        )}
      </td>
      <td className={styles.entity} data-label={texts.colEntity} role="cell">
        {activityEntityTitle(event.entity)}
      </td>
    </tr>
  );
}
