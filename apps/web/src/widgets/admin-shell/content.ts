/**
 * Разделы панели управления.
 *
 * Список один и кормит и боковую навигацию, и сводку на главной панели:
 * раздел, которого здесь нет, не появится ни там, ни там.
 */
export type AdminSection = {
  readonly href: string;
  readonly title: string;
  /** Подпись под названием в сводке: чем этот раздел управляет. */
  readonly hint: string;
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    href: '/admin/crm',
    title: 'Календарь работ',
    hint: 'Замеры, монтажи, звонки и заявки по дням',
  },
  { href: '/admin/company', title: 'Компания', hint: 'Контакты, адрес, часы работы, реквизиты' },
  { href: '/admin/catalog', title: 'Каталог', hint: 'Модели, цены, фотографии, скидки' },
  { href: '/admin/prices', title: 'Цены на монтаж', hint: 'Прайс по классам и ставки допуслуг' },
  { href: '/admin/knowledge', title: 'База знаний', hint: 'Статьи и их публикация' },
  { href: '/admin/reviews', title: 'Отзывы', hint: 'Модерация: публикация и отклонение' },
  { href: '/admin/leads', title: 'Заявки', hint: 'Обращения с сайта и их статусы' },
  {
    href: '/admin/notifications',
    title: 'Уведомления',
    hint: 'Куда уходит сообщение о новой заявке',
  },
];

export const adminShellContent = {
  brand: 'Панель управления',
  /** Короткие подписи для телефона: полные уводят шапку на вторую строку. */
  brandShort: 'Панель',
  /** Ссылка на сам сайт: смотреть результат правки нужно постоянно. */
  site: 'Открыть сайт',
  siteShort: 'Сайт',
  logout: 'Выйти',
  navLabel: 'Разделы панели управления',
  /** Кнопка колонки разделов: подпись меняется по состоянию. */
  navHide: 'Скрыть разделы',
  navShow: 'Показать разделы',
  menu: 'Меню',
} as const;
