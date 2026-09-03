import type { ButtonLinkHref } from '@/shared/ui';

import type { ArticleTeaser } from '../model';

/**
 * Данные историй и тестов карточки статьи.
 *
 * 🔴 Это витрина вёрстки, а не контент: на сайт эти строки не попадают ни при
 * каких условиях — карточка рисует только статью, пришедшую пропсами из базы.
 */

export const articleHrefFixture: ButtonLinkHref = { pathname: '/knowledge/kak-vybrat' };

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

/** Обычная статья: рубрика, заголовок в две строки, анонс, дата. */
export const articleFixture: ArticleTeaser = {
  id: 'demo-1',
  slug: 'kak-vybrat',
  title: 'Как подобрать мощность кондиционера по площади комнаты',
  category: 'Выбор',
  date: new Date('2026-06-14T00:00:00.000Z'),
  minutes: 6,
  excerpt:
    'Формула, поправки на солнечную сторону и технику — и почему «на глаз» ошибаются ' +
    'чаще, чем кажется.',
  cover: null,
};

/** Обложку владелец загружает не всегда — карточка обязана пережить обе формы. */
export const articleWithCoverFixture: ArticleTeaser = {
  ...articleFixture,
  id: 'demo-cover',
  slug: 'kak-obmanyvayut',
  title: 'Как обманывают при установке кондиционера: пять схем',
  category: 'Монтаж',
  cover: SAMPLE_COVER,
};

/** Длинные заголовок, рубрика и анонс: проверка обрывов на 320px. */
export const articleLongFixture: ArticleTeaser = {
  ...articleFixture,
  id: 'demo-long',
  slug: 'shtroblenie-ili-korob',
  title: 'Штробление стены или пластиковый короб: чем прятать трассу в готовом ремонте',
  category: 'Монтаж и подготовка',
  minutes: 12,
  excerpt:
    'Разбираем оба способа по пыли, срокам и деньгам, а заодно — когда трассу лучше ' +
    'вывести по фасаду, чем это грозит на панельном доме и сколько стоит переделка, ' +
    'если решение приняли не глядя.',
};

/** Владелец не заполнил ни рубрику, ни анонс — карточка не имеет права развалиться. */
export const articleBareFixture: ArticleTeaser = {
  ...articleFixture,
  id: 'demo-bare',
  slug: 'zametka',
  title: 'Короткая заметка без рубрики и анонса',
  category: '',
  excerpt: '',
};
