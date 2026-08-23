import type { ButtonLinkHref } from '@/shared/ui';

import type { ReviewCardData } from './model';

/**
 * Данные для историй и тестов.
 *
 * 🔴 Это витрина вёрстки, а не контент: на сайт эти строки не попадают ни при
 * каких условиях — блок рисует только то, что пришло пропсами из базы. Живых
 * отзывов у проекта нет, сидов с отзывами тоже нет и не будет (ADR-012,
 * инвариант 10). Основное состояние блока — пустое, ему фикстуры не нужны.
 */

/** Страница политики появится в волне 2 — до тех пор адрес объектом, не литералом. */
export const policyHrefFixture: ButtonLinkHref = { pathname: '/privacy' };

/**
 * Фото прямо в фикстуре: data-URI, чтобы истории не зависели ни от загруженных
 * файлов, ни от работающего `/api/media`.
 */
const SAMPLE_PHOTO =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="347">' +
      '<rect width="520" height="347" fill="#cbd5e1"/>' +
      '<rect x="150" y="96" width="220" height="90" rx="12" fill="#f8fafc"/>' +
      '<rect x="166" y="150" width="188" height="8" rx="4" fill="#cbd5e1"/>' +
      '</svg>',
  );

const DEMO_TEXT =
  'Ставили сплит в спальню: приехали в назначенное время, ' +
  'трассу спрятали в короб, за собой убрали. Смета совпала с расчётом по телефону.';

export const reviewsFixture: readonly ReviewCardData[] = [
  {
    id: 'demo-1',
    name: 'Ирина',
    rating: 5,
    text: DEMO_TEXT,
    photo: null,
    avatar: null,
    createdAt: new Date('2026-06-14T00:00:00.000Z'),
  },
  {
    id: 'demo-2',
    name: 'Сергей',
    rating: 4,
    text:
      'Второй кондиционер у этих ребят. В этот раз ждал выезда три дня из-за жары, ' +
      'но по монтажу вопросов нет: вакуумацию делали при мне.',
    photo: null,
    avatar: null,
    createdAt: new Date('2026-06-02T00:00:00.000Z'),
  },
  {
    id: 'demo-3',
    name: 'Марина',
    rating: 5,
    text: 'Подобрали модель по площади, объяснили разницу с инвертором. Работает тихо, спим спокойно.',
    photo: null,
    avatar: null,
    createdAt: new Date('2026-05-21T00:00:00.000Z'),
  },
  {
    id: 'demo-4',
    name: 'Алексей Владимирович',
    rating: 4,
    text: 'Монтаж в частном доме, длинная трасса. Посчитали заранее, по факту доплат не было.',
    photo: null,
    avatar: null,
    createdAt: new Date('2026-05-08T00:00:00.000Z'),
  },
];

/** Отзыв с приложенной фотографией — снимок присылает клиент, он необязателен. */
export const reviewWithPhotoFixture: ReviewCardData = {
  id: 'demo-photo',
  name: 'Дмитрий',
  rating: 5,
  text: 'Аккуратно вывели трассу по фасаду — прикладываю фото, как получилось.',
  photo: SAMPLE_PHOTO,
  avatar: null,
  createdAt: new Date('2026-06-18T00:00:00.000Z'),
};

/** Фотография необязательна: карточка без неё не разъезжается. */
export const reviewWithoutPhotoFixture: ReviewCardData = {
  id: 'demo-no-photo',
  name: 'Ольга',
  rating: 3,
  text: 'Работой довольна, но звонка о переносе времени пришлось ждать до последнего.',
  photo: null,
  avatar: null,
  createdAt: new Date('2026-04-30T00:00:00.000Z'),
};
