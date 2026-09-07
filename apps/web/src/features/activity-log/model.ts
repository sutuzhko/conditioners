import type { Page } from '@/shared/lib/paging';

/** Адрес раздела. Один на проект: по нему же строится разбивка. */
export const ACTIVITY_PATH = '/admin/activity';

/**
 * Автор события: имя для показа и `id` — им фаза 4 отбирает журнал по человеку.
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
 * Ссылка на карточку сущности появится вместе с лентой в карточке — фаза 4.
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
  readonly createdAt: string;
};

export type ActivityPage = Page<ActivityEventView>;

/** Что журнал читает из адреса. Пока только номер страницы — отбор придёт фазой 4. */
export type ActivitySearchParams = {
  readonly page?: string | undefined;
};
