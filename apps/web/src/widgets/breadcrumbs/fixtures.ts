import type { BreadcrumbItem } from '@/shared/seo';

/**
 * Фикстуры хлебных крошек: ими питаются stories (в Storybook ни базы, ни
 * настроек нет) и тесты. Домен выдуманный — канонический адрес приходит из
 * `SITE_URL`, а не из кода (docs/PROJECT.md §3).
 */
export const siteUrlFixture = 'https://example-klimat.ru';

/** Статья: два уровня вглубь — предел вложенности карты URL (ADR-049). */
export const nestedTrail: readonly BreadcrumbItem[] = [
  { name: 'База знаний', path: '/knowledge' },
  { name: 'Как выбрать кондиционер' },
];

/** Страница без родителя, кроме главной: один уровень. */
export const singleTrail: readonly BreadcrumbItem[] = [
  { name: 'Политика обработки персональных данных' },
];

/** Статья Базы знаний с длинным заголовком — проверка переноса следа. */
export const articleTrail: readonly BreadcrumbItem[] = [
  { name: 'База знаний', path: '/knowledge' },
  { name: 'Инвертор или обычный кондиционер: за сколько окупается разница в цене' },
];
