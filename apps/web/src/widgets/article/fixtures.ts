import type { ButtonLinkHref } from '@/shared/ui';

import type { ArticleFull, ArticleLink, ArticleTeaser } from './model';

/**
 * Данные историй и тестов.
 *
 * 🔴 Это витрина вёрстки, а не контент: на сайт эти строки не попадают ни при
 * каких условиях — блоки рисуют только то, что пришло из базы.
 */

/**
 * Адрес статьи. Записан объектом, а не строкой: `typedRoutes` выводит тип
 * динамического маршрута только из литерала в самом `<Link href>`, а через
 * пропс-функцию с типом `ButtonLinkHref` параметр маршрута не выводится.
 */
export function articleHrefFixture(slug: string): ButtonLinkHref {
  return { pathname: `/knowledge/${slug}` };
}

export function categoryHrefFixture(category: string | null): ButtonLinkHref {
  return category === null ? '/knowledge' : { pathname: '/knowledge', query: { category } };
}

export const listHrefFixture: ButtonLinkHref = '/knowledge';
export const leadHrefFixture: ButtonLinkHref = '/#lead';

export const ctaLinksFixture: readonly ArticleLink[] = [
  { label: 'Каталог кондиционеров с ценами', href: '/#catalog' },
  { label: 'Установка кондиционеров под ключ', href: '/#installation' },
];

/** Обложка прямо в фикстуре: истории не зависят от работающего `/api/media`. */
const SAMPLE_COVER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="525">' +
      '<rect width="1200" height="525" fill="#cbd5e1"/>' +
      '<rect x="470" y="200" width="260" height="120" rx="14" fill="#f8fafc"/>' +
      '</svg>',
  );

export const teasersFixture: readonly ArticleTeaser[] = [
  {
    id: 'demo-1',
    slug: 'kak-vybrat-kondicioner',
    title: 'Как выбрать кондиционер для квартиры: площадь, мощность, инвертор',
    category: 'Выбор',
    date: new Date('2026-06-14T00:00:00.000Z'),
    minutes: 6,
    excerpt:
      'Разбираем по шагам: сколько киловатт нужно на комнату, какие поправки ' +
      'добавить и когда переплата за инвертор окупается.',
    cover: null,
  },
  {
    id: 'demo-2',
    slug: 'kak-obmanyvayut-pri-ustanovke',
    title: 'Как обманывают при установке кондиционера: пять схем',
    category: 'Монтаж',
    date: new Date('2026-05-30T00:00:00.000Z'),
    minutes: 7,
    excerpt:
      'Дешёвая трасса, пропущенная вакуумация и «доплата на месте» — как распознать заранее.',
    cover: SAMPLE_COVER,
  },
  {
    id: 'demo-3',
    slug: 'uhod-za-kondicionerom',
    title: 'Уход за кондиционером: чистка фильтров и ежегодное ТО',
    category: 'Уход',
    date: new Date('2026-05-12T00:00:00.000Z'),
    minutes: 5,
    excerpt: 'Что можно сделать самому за десять минут, а что стоит оставить мастеру.',
    cover: null,
  },
];

/** Одна рубрика на весь раздел: фильтру тогда нечего фильтровать. */
export const singleCategoryFixture: readonly ArticleTeaser[] = [
  teasersFixture[0] ?? {
    id: 'demo-single',
    slug: 'kak-vybrat-kondicioner',
    title: 'Как выбрать кондиционер для квартиры',
    category: 'Выбор',
    date: new Date('2026-06-14T00:00:00.000Z'),
    minutes: 6,
    excerpt: 'Мощность, поправки и инвертор.',
    cover: null,
  },
];

/** Текст в мини-формате PROJECT §2.7 — ровно в том виде, в каком его правит владелец. */
export const bodyFixture = [
  'Кондиционер выбирают один раз в 10 лет, поэтому ошибка обходится дорого.',
  '',
  '## Шаг 1. Мощность по площади',
  '',
  'Базовое правило: **1 кВт** холодопроизводительности на 10 м². Отсюда и классы:',
  '',
  '- **07** — комната до 20 м²',
  '- **09** — комната до 27 м²',
  '',
  '### Поправки, о которых забывают',
  '',
  'Окна на юг добавляют **20%**, последний этаж — ещё десять.',
  '',
  '## Шаг 2. Инвертор или on/off',
  '',
  'Инвертор держит температуру точнее и тише работает ночью.',
  '',
  '## Шаг 3. Уровень шума',
  '',
  '> Не хотите считать сами — оставьте заявку, посчитаем вместе с установкой.',
].join('\n');

export const articleFixture: ArticleFull = {
  title: 'Как выбрать кондиционер для квартиры: площадь, мощность, инвертор',
  category: 'Выбор',
  date: new Date('2026-06-14T00:00:00.000Z'),
  minutes: 6,
  cover: null,
  body: bodyFixture,
};

export const articleWithCoverFixture: ArticleFull = { ...articleFixture, cover: SAMPLE_COVER };

/** Короткая заметка: разделов меньше трёх — оглавления быть не должно. */
export const shortArticleFixture: ArticleFull = {
  ...articleFixture,
  title: 'Можно ли греться кондиционером зимой',
  category: 'Эксплуатация',
  minutes: 3,
  body: [
    'Коротко: можно, но не всяким.',
    '',
    '## Что смотреть в характеристиках',
    '',
    'Нижний предел температуры наружного блока.',
  ].join('\n'),
};
