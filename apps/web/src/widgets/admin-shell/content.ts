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
  /** Подпись под названием в сводке и на странице настроек: чем раздел управляет. */
  readonly hint: string;
  /** Кому раздел показывается. */
  readonly roles: readonly AdminRole[];
  /** Где стоит пункт: в списке, в прибитом низу или внутри «Настроек». */
  readonly place: AdminSectionPlace;
  /**
   * Раздел без вложенных страниц.
   *
   * 🔴 Нужен ровно «Обзору»: его адрес `/admin` — начало каждого адреса
   * панели, и по общему правилу «раздел владеет своим поддеревом» он забрал
   * бы себе и каталог, и склад, и неизвестные адреса вместе с ними.
   */
  readonly exact?: boolean | undefined;
  /** Заголовок группы. Есть только у пунктов списка — остальным его негде показать. */
  readonly group?: AdminSectionGroup | undefined;
};

/**
 * Где раздел стоит в колонке (ADR-188).
 *
 * 🔴 `settings` — это не «спрятан», а «открывается со страницы «Настройки»».
 * Компания, цены и уведомления — конфигурация: её заполняют однажды и правят
 * редко, и держать их в колонке рядом с ежедневной работой значит удлинять
 * дорогу к тому, ради чего в панель заходят каждое утро. Адреса при этом не
 * двигаются: `/admin/company` и соседи остаются на месте.
 */
export type AdminSectionPlace = 'main' | 'settings' | 'bottom';

/**
 * Группы в прокручиваемом списке. Работа — сверху и без заголовка: в неё
 * заходят каждый день, а подпись над первым же пунктом только отодвигает его
 * вниз.
 */
export type AdminSectionGroup = 'work' | 'site';

export const ADMIN_GROUP_TITLES: Readonly<Record<AdminSectionGroup, string | null>> = {
  work: null,
  site: 'Сайт',
};

/** Подпись роли в карточке «кто вошёл». С заглавной: это подпись, а не часть фразы. */
export const ADMIN_ROLE_TITLES: Readonly<Record<AdminRole, string>> = {
  owner: 'Владелец',
  installer: 'Монтажник',
};

/** Страница-указатель, которую открывает пункт «Настройки». */
export const ADMIN_SETTINGS_PATH = '/admin/settings';

const BOTH: readonly AdminRole[] = ['owner', 'installer'];
const OWNER: readonly AdminRole[] = ['owner'];

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    href: '/admin',
    title: 'Обзор',
    hint: 'Что требует внимания прямо сейчас',
    roles: OWNER,
    place: 'main',
    group: 'work',
    exact: true,
  },
  {
    href: '/admin/crm',
    title: 'Календарь работ',
    hint: 'Замеры, монтажи, звонки и заявки по дням',
    roles: BOTH,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/orders',
    title: 'Заказы',
    hint: 'Наряды на монтаж, обслуживание и ремонт: кто едет, когда и за сколько',
    roles: BOTH,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/leads',
    title: 'Заявки',
    hint: 'Обращения с сайта и их статусы',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/clients',
    title: 'Клиенты',
    hint: 'База людей: телефоны, адреса и история обращений',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/team',
    title: 'Монтажники',
    hint: 'Команда: доступ в панель, телефоны, заметки',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/stock',
    title: 'Склад',
    hint: 'Остатки материалов по зонам, приход и что пора заказывать',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/catalog',
    title: 'Каталог',
    hint: 'Модели, цены, фотографии, скидки',
    roles: OWNER,
    place: 'main',
    group: 'site',
  },
  {
    href: '/admin/knowledge',
    title: 'База знаний',
    hint: 'Статьи и их публикация',
    roles: OWNER,
    place: 'main',
    group: 'site',
  },
  {
    href: '/admin/reviews',
    title: 'Отзывы',
    hint: 'Модерация: публикация и отклонение',
    roles: OWNER,
    place: 'main',
    group: 'site',
  },

  /* Конфигурация: заполняется однажды, правится редко. Открывается со
     страницы «Настройки», в колонке не стоит (ADR-188). */
  {
    href: '/admin/company',
    title: 'Компания',
    hint: 'Контакты, адрес, часы работы, реквизиты',
    roles: OWNER,
    place: 'settings',
  },
  {
    href: '/admin/prices',
    title: 'Цены на монтаж',
    hint: 'Прайс по классам и ставки допуслуг',
    roles: OWNER,
    place: 'settings',
  },
  {
    href: '/admin/notifications',
    title: 'Уведомления',
    hint: 'Куда уходит сообщение о новой заявке',
    roles: OWNER,
    place: 'settings',
  },

  /* Прибитый низ колонки: редкое и личное. Порядок — от общего к личному и
     дальше к необратимому, «Выйти» последним (ADR-188). */
  {
    href: ADMIN_SETTINGS_PATH,
    title: 'Настройки',
    hint: 'Компания, цены на монтаж и уведомления',
    roles: OWNER,
    place: 'bottom',
  },
  {
    href: '/admin/profile',
    title: 'Профиль',
    hint: 'Имя, телефон, пароль и тема интерфейса',
    roles: BOTH,
    place: 'bottom',
  },
];

export function sectionsFor(role: AdminRole): readonly AdminSection[] {
  return ADMIN_SECTIONS.filter((section) => section.roles.includes(role));
}

/** Прокручиваемый список колонки: работа и сайт. */
export function columnSectionsFor(role: AdminRole): readonly AdminSection[] {
  return sectionsFor(role).filter((section) => section.place === 'main');
}

/** Прибитый низ колонки: настройки и профиль. */
export function bottomSectionsFor(role: AdminRole): readonly AdminSection[] {
  return sectionsFor(role).filter((section) => section.place === 'bottom');
}

/** Что открывает страница «Настройки»: три страницы конфигурации (ADR-188). */
export function settingsSectionsFor(role: AdminRole): readonly AdminSection[] {
  return sectionsFor(role).filter((section) => section.place === 'settings');
}

/**
 * Раздел, которому принадлежит адрес: `/admin/catalog/42` — это «Каталог».
 *
 * 🔴 Выигрывает самое длинное совпадение, а не первое: список читают и сверху
 * вниз, и порядок в нём — про колонку, а не про адреса. «Обзор» вложенных
 * страниц не имеет вовсе (`exact`) — иначе он забрал бы себе всю панель.
 */
export function sectionOf(pathname: string): AdminSection | undefined {
  let best: AdminSection | undefined;

  for (const section of ADMIN_SECTIONS) {
    const owns =
      pathname === section.href ||
      (section.exact !== true && pathname.startsWith(`${section.href}/`));

    if (!owns) continue;
    if (best === undefined || section.href.length > best.href.length) best = section;
  }

  return best;
}

/**
 * Пункт колонки, который подсвечивается для этого адреса.
 *
 * Разделы конфигурации в колонке не стоят, и на `/admin/company` подсветка
 * пропала бы вовсе — вместо них горит «Настройки», через которые в них и
 * заходят (ADR-188).
 */
export function navHrefOf(pathname: string): string | undefined {
  const section = sectionOf(pathname);
  if (section === undefined) return undefined;

  return section.place === 'settings' ? ADMIN_SETTINGS_PATH : section.href;
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
  /** Второй `<nav>` колонки: без своего имени читалка не отличит его от первого. */
  accountLabel: 'Настройки и профиль',
  settingsTitle: 'Настройки',
  settingsLead: 'Три страницы конфигурации: заполняются однажды и правятся редко',
  /** Кнопка колонки разделов: подпись меняется по состоянию. */
  navHide: 'Скрыть разделы',
  navShow: 'Показать разделы',
  menu: 'Меню',
} as const;
