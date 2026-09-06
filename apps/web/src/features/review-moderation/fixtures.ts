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

/**
 * Снимок прямо в фикстуре: data-URI, чтобы истории не зависели ни от
 * загруженных файлов, ни от работающего `/api/media`.
 *
 * 🔴 Витрина собирается статикой (ADR-231) и раздаёт только `apps/web/public`,
 * где лежат одни шрифты. Адрес `/api/media/...` в ней мёртв, и история «Со
 * снимком» показывала бы битую картинку — то самое состояние, которое соседняя
 * история показывает нарочно. Две истории про разное выглядели одинаково.
 *
 * `next/image` для `data:` сам ставит `unoptimized` (`get-img-props`), поэтому
 * ни одного пропа ради витрины в боевой код не уезжает.
 *
 * Пропорции 4:3 — те же, что у превью 220×165: история показывает кадр той же
 * формы, что придёт из админки.
 */
const SAMPLE_PHOTO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="330">' +
      '<rect width="440" height="330" fill="#cbd5e1"/>' +
      '<rect x="110" y="86" width="220" height="82" rx="12" fill="#f8fafc"/>' +
      '<rect x="128" y="134" width="184" height="8" rx="4" fill="#cbd5e1"/>' +
      '<rect x="86" y="214" width="268" height="10" rx="5" fill="#e2e8f0"/>' +
      '</svg>',
  );

/** Отзыв со снимком места установки: по нему модератор и принимает решение. */
export const reviewWithPhoto: ReviewCard = {
  ...pendingReview,
  id: 'r5',
  name: 'Екатерина Смирнова',
  photo: SAMPLE_PHOTO,
};

/**
 * Отзыв, у которого ссылка на снимок есть, а файла на диске нет — issue #662.
 *
 * 🔴 Состояние не выдуманное: том переезжает, каталог загрузок не
 * примонтирован, база наполнена в другом окружении — и модератор видит рамку
 * вместо снимка. Раньше на этом месте был значок битого файла и живая ссылка
 * «открыть в полный размер», ведущая в 404.
 */
export const reviewWithMissingPhoto: ReviewCard = {
  ...reviewWithPhoto,
  id: 'r9',
  /* 🔴 Адрес настоящей формы, а не заглушка из соседней фикстуры: так и
     выглядит мёртвая ссылка в базе — запись на файл, которого нет. Картинка по
     нему не запрашивается вовсе: при `photoMissing` карточка рисует рамку, а
     `<img>` не создаёт. */
  photo: '/api/media/demo-review.jpg',
  photoMissing: true,
};

/**
 * Строки для таблиц вкладок: по одному отзыву каждого состояния.
 *
 * 🔴 Тексты выдуманы для истории и в разметку сайта не попадают: `Review` и
 * `AggregateRating` собираются только из настоящих записей базы (инвариант 10).
 */
export const tableReviewsFixture: readonly ReviewCard[] = [
  approvedReview,
  archivedReview,
  rejectedReview,
  lowRatedReview,
];

export const acceptingApi: ReviewApi = {
  setStatus: async () => ({ ok: true }),
  remove: async () => ({ ok: true }),
};

export const failingApi: ReviewApi = {
  setStatus: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
  remove: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
};
