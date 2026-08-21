import type { BreadcrumbItem } from '@/shared/seo';

/**
 * Фикстуры хлебных крошек: ими питаются stories (в Storybook ни базы, ни
 * настроек нет) и тесты. Домен выдуманный — канонический адрес приходит из
 * `SITE_URL`, а не из кода (docs/PROJECT.md §3).
 */
export const siteUrlFixture = 'https://example-klimat.ru';

/** Карточка товара: два уровня вглубь — предел вложенности карты URL. */
export const productTrail: readonly BreadcrumbItem[] = [
  { name: 'Каталог', path: '/catalog' },
  { name: 'Сплит-система 09' },
];

/** Страница услуги: один уровень. */
export const serviceTrail: readonly BreadcrumbItem[] = [{ name: 'Установка кондиционеров' }];

/** Статья Базы знаний с длинным заголовком — проверка переноса следа. */
export const articleTrail: readonly BreadcrumbItem[] = [
  { name: 'База знаний', path: '/knowledge' },
  { name: 'Инвертор или обычный кондиционер: за сколько окупается разница в цене' },
];
