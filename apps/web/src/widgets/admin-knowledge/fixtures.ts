/** Данные для историй и тестов списка статей. */
import type { ArticleRow } from './AdminArticleList';

export const articleRowsFixture: readonly ArticleRow[] = [
  {
    id: '1',
    title: 'Инвертор или обычный кондиционер',
    slug: 'invertor-ili-obychnyy',
    category: 'Выбор техники',
    date: '2026-08-01T00:00:00.000Z',
    minutes: 6,
    published: true,
  },
  {
    id: '2',
    title: 'Как часто чистить кондиционер',
    slug: 'kak-chasto-chistit',
    category: 'Эксплуатация',
    date: '2026-07-14T00:00:00.000Z',
    minutes: 4,
    published: true,
  },
  {
    id: '3',
    title: 'Черновик про монтаж в панельном доме',
    slug: 'montazh-v-panelnom-dome',
    category: 'Монтаж',
    date: '2026-08-20T00:00:00.000Z',
    minutes: 8,
    published: false,
  },
];
