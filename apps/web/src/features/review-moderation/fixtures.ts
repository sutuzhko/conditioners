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
  reject: null,
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

/** Отклонённый с записанной причиной — обычный случай после ADR-300. */
export const rejectedReview: ReviewCard = {
  ...pendingReview,
  id: 'r4',
  name: 'Аноним',
  rating: 1,
  text: 'Текст рекламы стороннего магазина со ссылкой.',
  status: 'rejected',
  reject: {
    reason: 'Реклама стороннего магазина со ссылкой — не отзыв о нашей работе',
    by: 'Богдан',
    at: '2026-08-19T08:30:00.000Z',
  },
};

/**
 * Отклонённый до появления поля причины: причины нет и не будет.
 *
 * 🔴 Выдумывать её нельзя, и панель обязана сказать это прямо — пустое место
 * под подписью «Причина отказа» читается как «причины не было».
 */
export const rejectedWithoutReason: ReviewCard = {
  ...rejectedReview,
  id: 'r6',
  name: 'Без причины',
  reject: null,
};

/** Отказ кнопкой в Telegram: причина есть, учётной записи за ней нет. */
export const rejectedFromTelegram: ReviewCard = {
  ...rejectedReview,
  id: 'r7',
  name: 'Из чата',
  reject: {
    reason: 'Отклонено кнопкой в Telegram — Богдан. Причина не записана.',
    by: null,
    at: '2026-08-19T08:30:00.000Z',
  },
};

/** Снятый с сайта: не плохой, а устаревший — его возвращают, а не стирают. */
export const archivedReview: ReviewCard = {
  ...pendingReview,
  id: 'r8',
  name: 'Сергей',
  text: 'Ставили сплит в 2019-м, работает до сих пор. Модели этой давно нет в продаже.',
  status: 'archived',
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
