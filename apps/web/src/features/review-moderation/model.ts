/** Модерация отзывов — контракт docs/API.md §7. */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  'pending',
  'approved',
  'rejected',
  'archived',
];

export function isReviewStatus(value: string): value is ReviewStatus {
  return REVIEW_STATUSES.some((status) => status === value);
}

/**
 * Отзыв в модерации.
 *
 * 🔴 Полей для правки текста здесь нет и не будет: модератор меняет только
 * статус (инвариант 7). Редактируемый отзыв — это не отзыв.
 */
export type ReviewCard = {
  readonly id: string;
  readonly name: string;
  readonly rating: number;
  readonly text: string;
  readonly photo: string | null;
  readonly status: ReviewStatus;
  readonly createdAt: string;
};

export type ReviewActionResult = { readonly ok: boolean; readonly message?: string };

export type ReviewApi = {
  readonly setStatus: (id: string, status: ReviewStatus) => Promise<ReviewActionResult>;
  readonly remove: (id: string) => Promise<ReviewActionResult>;
};
