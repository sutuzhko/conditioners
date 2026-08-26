/** Подписи списка статей. */
import { formatDateShort } from '@/shared/lib/format';

export const adminKnowledgeContent = {
  title: 'База знаний',
  lead: 'Статьи — поисковый актив сайта. Скопированный у конкурента текст не просто не даст трафика, он утянет вниз весь домен.',
  add: 'Написать статью',

  emptyTitle: 'Статей пока нет',
  emptyText:
    'Раздел базы знаний на сайте показывает пустое состояние. Статьи приводят трафик по вопросам, которые люди задают перед покупкой.',

  colTitle: 'Заголовок',
  colCategory: 'Рубрика',
  colDate: 'Дата',
  colMinutes: 'Чтение',
  colPublished: 'На сайте',

  published: 'Опубликована',
  draft: 'Черновик',
  edit: 'Править',

  editLabel: (title: string): string => `Править: ${title}`,
  minutes: (value: number): string => `${value} мин`,
  date: (iso: string): string => formatDateShort(iso),
} as const;
