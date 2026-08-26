import type { AdminRole } from '@/entities/staff/model';

/**
 * Разделы панели управления.
 *
 * Список один и кормит и боковую навигацию, и сводку на главной панели:
 * раздел, которого здесь нет, не появится ни там, ни там.
 *
 * 🔴 `roles` — это подсказка интерфейса, а не защита. Доступ монтажника к
 * чужому разделу закрывают `withOwner` в маршрутах и проверка роли на самой
 * странице (ADR-092): адреса панели он знает, он в ней работает.
 */
export type AdminSection = {
  readonly href: string;
  readonly title: string;
  /** Подпись под названием в сводке: чем этот раздел управляет. */
  readonly hint: string;
  /** Кому раздел показывается. */
  readonly roles: readonly AdminRole[];
  /** Заголовок группы, к которой относится раздел. */
  readonly group: AdminSectionGroup;
};

/**
 * Группы в колонке разделов. Работа — сверху и без заголовка: в неё заходят
 * каждый день, а подпись над первым же пунктом только отодвигает его вниз.
 */
export type AdminSectionGroup = 'work' | 'site' | 'account';

export const ADMIN_GROUP_TITLES: Readonly<Record<AdminSectionGroup, string | null>> = {
  work: null,
  site: 'Настройки · сайт',
  account: 'Аккаунт',
};

const BOTH: readonly AdminRole[] = ['owner', 'installer'];
const OWNER: readonly AdminRole[] = ['owner'];

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    href: '/admin/crm',
    title: 'Календарь работ',
    hint: 'Замеры, монтажи, звонки и заявки по дням',
    roles: BOTH,
    group: 'work',
  },
  {
    href: '/admin/orders',
    title: 'Заказы',
    hint: 'Наряды на монтаж, обслуживание и ремонт: кто едет, когда и за сколько',
    roles: BOTH,
    group: 'work',
  },
  {
    href: '/admin/leads',
    title: 'Заявки',
    hint: 'Обращения с сайта и их статусы',
    roles: OWNER,
    group: 'work',
  },
  {
    href: '/admin/clients',
    title: 'Клиенты',
    hint: 'База людей: телефоны, адреса и история обращений',
    roles: OWNER,
    group: 'work',
  },
  {
    href: '/admin/team',
    title: 'Монтажники',
    hint: 'Команда: доступ в панель, телефоны, заметки',
    roles: OWNER,
    group: 'work',
  },
  {
    href: '/admin/company',
    title: 'Компания',
    hint: 'Контакты, адрес, часы работы, реквизиты',
    roles: OWNER,
    group: 'site',
  },
  {
    href: '/admin/catalog',
    title: 'Каталог',
    hint: 'Модели, цены, фотографии, скидки',
    roles: OWNER,
    group: 'site',
  },
  {
    href: '/admin/prices',
    title: 'Цены на монтаж',
    hint: 'Прайс по классам и ставки допуслуг',
    roles: OWNER,
    group: 'site',
  },
  {
    href: '/admin/knowledge',
    title: 'База знаний',
    hint: 'Статьи и их публикация',
    roles: OWNER,
    group: 'site',
  },
  {
    href: '/admin/reviews',
    title: 'Отзывы',
    hint: 'Модерация: публикация и отклонение',
    roles: OWNER,
    group: 'site',
  },
  {
    href: '/admin/notifications',
    title: 'Уведомления',
    hint: 'Куда уходит сообщение о новой заявке',
    roles: OWNER,
    group: 'site',
  },
  {
    href: '/admin/profile',
    title: 'Профиль',
    hint: 'Имя, телефон, пароль и тема интерфейса',
    roles: BOTH,
    group: 'account',
  },
];

export function sectionsFor(role: AdminRole): readonly AdminSection[] {
  return ADMIN_SECTIONS.filter((section) => section.roles.includes(role));
}

/** Раздел, которому принадлежит адрес: `/admin/catalog/42` — это «Каталог». */
export function sectionOf(pathname: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );
}

/**
 * Пускать ли эту роль по этому адресу.
 *
 * Адрес вне известных разделов (сводка `/admin`) остаётся открытым обеим
 * ролям — что на нём показывать, решает сама страница.
 */
export function sectionAllows(pathname: string, role: AdminRole): boolean {
  if (role === 'owner') return true;

  const section = sectionOf(pathname);
  if (section !== undefined) return section.roles.includes(role);

  /* Сводка монтажнику не адресована: она про готовность сайта и модерацию. */
  return pathname !== '/admin';
}

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
