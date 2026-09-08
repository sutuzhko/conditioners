import type { Page } from '@/shared/lib/paging';

/** Адрес раздела. Один на проект: по нему же строится разбивка и отбор. */
export const ACTIVITY_PATH = '/admin/activity';

/**
 * Автор события: имя для показа и `id` — им журнал отбирается по человеку.
 *
 * 🔴 Форма повторяет ту, что отдаёт `repo/activity`, поле в поле. Слои
 * запрещают представлению импортировать серверный тип, поэтому он объявлен
 * заново — но объявлен **тождественно**, и страница передаёт страницу
 * репозитория списку как есть. Второй формы у автора нет: преобразование между
 * ними было бы швом, который ничего не даёт, а разойтись может (так и вышло —
 * `actorName` против `actor` уронил сборку раздела).
 */
export type ActivityActorView = {
  readonly id: string;
  readonly name: string;
};

/**
 * Событие так, как его показывает список.
 *
 * 🔴 Ни имени клиента, ни телефона, ни адреса: событие называет сущность и её
 * `id`, а содержимое читается из самой сущности (ADR-345, инвариант 12).
 * Ссылка на карточку сущности появится вместе с лентой в карточке — issue #817.
 */
/** Род автора: `user` без автора — учётку удалили, `system` — автора не было. */
export type ActivityActorKindView = 'user' | 'system';

export type ActivityEventView = {
  readonly id: string;
  /** `null` — автора нет по природе события либо учётную запись удалили. */
  readonly actor: ActivityActorView | null;
  /** Что именно означает пустой автор. */
  readonly actorKind: ActivityActorKindView;
  /** Ключ действия: `review.unpublish`. Подпись ищет `activityActionTitle`. */
  readonly action: string;
  /** Ключ сущности: `review`. */
  readonly entity: string;
  readonly entityId: string;
  /**
   * Пометка человека — единственное правимое поле записи (ADR-345, issue #820).
   * `null` — не комментировали.
   */
  readonly note: string | null;
  /** Когда пометку правили. Показывается вместе с ней, чтобы не гадать о свежести. */
  readonly noteUpdatedAt: string | null;
  readonly createdAt: string;
};

export type ActivityPage = Page<ActivityEventView>;

/**
 * Сотрудник в отборе «Кто».
 *
 * 🔴 Ровно два поля. Список приезжает из `repo/admin-users`, где у карточки
 * лежат и телефон, и ИНН, — и попасть в клиентский `Select` они не должны ни
 * при каких условиях (PROJECT §5.5): в бандл уезжает то, что положили в пропы.
 */
export type ActivityPersonView = {
  readonly id: string;
  readonly name: string;
};
