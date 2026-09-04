/** Данные для историй и тестов модерации отзывов. */
import type { ReviewApi, ReviewCard } from './model';

export const pendingReview: ReviewCard = {
  id: 'r1',
  name: 'Алексей',
  rating: 5,
  text: 'Приехали в тот же день, смету назвали заранее и не поменяли её на месте. Работает тихо.',
  photo: null,
  avatar: null,
  status: 'pending',
  createdAt: '2026-08-18T10:00:00.000Z',
};

export const approvedReview: ReviewCard = {
  ...pendingReview,
  id: 'r2',
  status: 'approved',
};

/** Низкая оценка: модерация не про «пропускать только хорошие». */
export const lowRatedReview: ReviewCard = {
  ...pendingReview,
  id: 'r3',
  name: 'Марина',
  rating: 2,
  text: 'Приехали на два часа позже обещанного, хотя работу сделали аккуратно.',
};

/** Отклонённый: место под причину отказа готово, самой причины пока нет (#522). */
export const rejectedReview: ReviewCard = {
  ...pendingReview,
  id: 'r4',
  name: 'Аноним',
  rating: 1,
  text: 'Текст рекламы стороннего магазина со ссылкой.',
  status: 'rejected',
};

/** Отзыв со снимком места установки: по нему модератор и принимает решение. */
export const reviewWithPhoto: ReviewCard = {
  ...pendingReview,
  id: 'r5',
  name: 'Екатерина Смирнова',
  photo: '/api/media/demo-review.jpg',
};

export const acceptingApi: ReviewApi = {
  setStatus: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
};

export const failingApi: ReviewApi = {
  setStatus: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
};
