import type { ButtonLinkHref } from '@/shared/ui';

import type { ArticleTeaser } from './model';

/**
 * Данные историй и тестов.
 *
 * 🔴 Это витрина вёрстки, а не контент: на сайт эти строки не попадают ни при
 * каких условиях — блок рисует только статьи, пришедшие пропсами из базы.
 */

/**
 * Маршрутов Базы знаний ещё нет (волна 2), поэтому адреса записаны объектом:
 * `typedRoutes` проверяет строковые литералы и пропускает `UrlObject`.
 */
export const allHrefFixture: ButtonLinkHref = { pathname: '/baza-znaniy' };

export function articleHrefFixture(slug: string): ButtonLinkHref {
  return { pathname: `/baza-znaniy/${slug}` };
}

/** Обложка прямо в фикстуре: истории не зависят от работающего `/api/media`. */
const SAMPLE_COVER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270">' +
      '<rect width="480" height="270" fill="#cbd5e1"/>' +
      '<rect x="150" y="80" width="180" height="70" rx="10" fill="#f8fafc"/>' +
      '<rect x="166" y="128" width="148" height="8" rx="4" fill="#cbd5e1"/>' +
      '</svg>',
  );

export const articlesFixture: readonly ArticleTeaser[] = [
  {
    id: 'demo-1',
    slug: 'invertor-ili-on-off',
    title: 'Инвертор или обычный кондиционер: что выбрать для квартиры',
    category: 'Выбор',
    date: new Date('2026-06-14T00:00:00.000Z'),
    minutes: 6,
    excerpt:
      'Разница не только в цене: считаем расход электричества за сезон и объясняем, ' +
      'когда переплата за инвертор не окупится.',
    cover: null,
  },
  {
    id: 'demo-2',
    slug: 'kak-chasto-chistit-kondicioner',
    title: 'Как часто чистить кондиционер и что будет, если этого не делать',
    category: 'Уход',
    date: new Date('2026-05-30T00:00:00.000Z'),
    minutes: 4,
    excerpt: 'Фильтры, теплообменник и дренаж: что можно сделать самому, а что оставить мастеру.',
    cover: null,
  },
  {
    id: 'demo-3',
    slug: 'kondicioner-zimoy',
    title: 'Можно ли греться кондиционером зимой в средней полосе',
    category: 'Эксплуатация',
    date: new Date('2026-05-12T00:00:00.000Z'),
    minutes: 5,
    excerpt: 'До какой температуры на улице тепловой насос ещё выгоднее обогревателя.',
    cover: null,
  },
];

/** Обложку владелец загружает не всегда — карточка обязана пережить обе формы. */
export const articleWithCoverFixture: ArticleTeaser = {
  id: 'demo-cover',
  slug: 'kak-vybrat-moshchnost',
  title: 'Как подобрать мощность кондиционера по площади комнаты',
  category: 'Выбор',
  date: new Date('2026-06-02T00:00:00.000Z'),
  minutes: 7,
  excerpt: 'Формула, поправки на солнечную сторону и технику — и почему «на глаз» ошибаются.',
  cover: SAMPLE_COVER,
};

/** Длинные заголовок и рубрика: проверка переносов на 320px. */
export const articleLongFixture: ArticleTeaser = {
  id: 'demo-long',
  slug: 'shtroblenie-ili-korob',
  title: 'Штробление стены или пластиковый короб: чем прятать трассу в готовом ремонте',
  category: 'Монтаж и подготовка',
  date: new Date('2026-04-18T00:00:00.000Z'),
  minutes: 9,
  excerpt:
    'Разбираем оба способа по пыли, срокам и деньгам, а заодно — когда трассу лучше ' +
    'вывести по фасаду и чем это грозит на панельном доме.',
  cover: null,
};
