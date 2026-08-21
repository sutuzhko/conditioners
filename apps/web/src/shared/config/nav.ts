import type { NavItem } from '@/widgets/header';

/**
 * Навигация сайта. Здесь перечислено только то, что на странице действительно
 * есть: ссылка на несуществующий якорь — это мёртвая ссылка, которую видят
 * и посетитель, и робот. Пункты добавляются по мере готовности блоков.
 */
export const SITE_NAV: readonly NavItem[] = [
  { label: 'Каталог', href: '#catalog' },
  { label: 'Цены', href: '#ceny' },
  { label: 'Монтаж', href: '#etapy' },
  { label: 'Услуги', href: '#uslugi' },
  { label: 'Сервис', href: '#diagnostika' },
  { label: 'Контакты', href: '#kontakty' },
];

/** Куда ведёт кнопка заявки. */
export const LEAD_ANCHOR = '#zayavka';

/**
 * Политика обработки персональных данных. Записана объектом, а не строкой:
 * страницы ещё нет, а typedRoutes проверяет строковые литералы по факту
 * существования маршрута и ломает сборку.
 */
export const POLICY_HREF = { pathname: '/politika-konfidencialnosti' } as const;
