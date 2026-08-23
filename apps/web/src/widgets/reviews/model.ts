import type { Review } from '@/entities/review/model';

/**
 * Что блоку нужно от отзыва.
 *
 * Не весь `Review`: `status` секции не нужен — 🔴 блок в базу не ходит и
 * получает уже одобренные отзывы пропсами (docs/ORCHESTRATION.md, «Блок не
 * ходит в базу»). Отбор по статусу делает страница через репозиторий: иначе
 * фильтр пришлось бы дублировать в каждом месте, где отзывы показываются.
 */
export type ReviewCardData = Pick<
  Review,
  'id' | 'name' | 'rating' | 'text' | 'photo' | 'avatar' | 'createdAt'
>;

/**
 * Буква для кружка-аватара — когда человек не приложил своё фото.
 *
 * 🔴 Именно буква, а не стоковое лицо: рисовать за автора чужую физиономию
 * значит выдумывать отзыв наполовину.
 */
export function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}
