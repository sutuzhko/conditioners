import type { AdminRole } from '@/entities/staff/model';
import type { AdminCounterKey } from '@/shared/config/admin-counters';
import type { IconName } from '@/shared/ui';

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
  /** Значок: на планшете колонка сворачивается в рельс, и подписи там нет. */
  readonly icon: IconName;
  /**
   * Короткая подпись для нижней панели телефона.
   *
   * Ячейка там — пятая часть экрана: «Календарь работ» обрезается многоточием
   * на любой ширине, и от подписи остаётся «Календарь …».
   */
  readonly short?: string | undefined;
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
  /**
   * Очередь, число которой стоит у пункта (ADR-309).
   *
   * Есть не у каждого раздела: счётчик показывает то, что ждёт решения, —
   * наряд в работе, новое обращение, отзыв на модерации. У «Клиентов» и
   * «Каталога» ждать нечего, и пустое место у них не пропуск, а ответ.
   */
  readonly counter?: AdminCounterKey | undefined;
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

/**
 * Что именно ждёт в очереди — подпись рядом с числом.
 *
 * 🔴 Голое число читалка озвучивает как «Заказы 7» и не отвечает, семь чего.
 * Подпись скрыта от глаза и звучит вслух: «Заказы, 7 в работе». Правило то же,
 * что у любого счётчика: сообщение целиком, а не цифра отдельно.
 */
export const ADMIN_COUNTER_TITLES: Readonly<Record<AdminCounterKey, string>> = {
  orders: 'в работе',
  leads: 'новых',
  reviews: 'на модерации',
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
    icon: 'overview',
    roles: OWNER,
    place: 'main',
    group: 'work',
    exact: true,
  },
  {
    href: '/admin/crm',
    title: 'Календарь работ',
    short: 'Календарь',
    hint: 'Замеры, монтажи, звонки и заявки по дням',
    icon: 'calendar',
    roles: BOTH,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/orders',
    title: 'Заказы',
    hint: 'Наряды на монтаж, обслуживание и ремонт: кто едет, когда и за сколько',
    icon: 'orders',
    roles: BOTH,
    place: 'main',
    group: 'work',
    counter: 'orders',
  },
  {
    href: '/admin/leads',
    title: 'Заявки',
    hint: 'Обращения с сайта и их статусы',
    icon: 'leads',
    roles: OWNER,
    place: 'main',
    group: 'work',
    counter: 'leads',
  },
  {
    href: '/admin/clients',
    title: 'Клиенты',
    hint: 'База людей: телефоны, адреса и история обращений',
    icon: 'clients',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/team',
    title: 'Монтажники',
    hint: 'Команда: доступ в панель, телефоны, заметки',
    icon: 'team',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/stock',
    title: 'Склад',
    hint: 'Остатки материалов по зонам, приход и что пора заказывать',
    icon: 'stock',
    roles: OWNER,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/catalog',
    title: 'Каталог',
    hint: 'Модели, цены, фотографии, скидки',
    icon: 'conditioner',
    roles: OWNER,
    place: 'main',
    group: 'site',
  },
  {
    href: '/admin/knowledge',
    title: 'База знаний',
    hint: 'Статьи и их публикация',
    icon: 'knowledge',
    roles: OWNER,
    place: 'main',
    group: 'site',
  },
  {
    href: '/admin/reviews',
    title: 'Отзывы',
    hint: 'Модерация: публикация и отклонение',
    icon: 'star',
    roles: OWNER,
    place: 'main',
    group: 'site',
    counter: 'reviews',
  },

  /* Конфигурация: заполняется однажды, правится редко. Открывается со
     страницы «Настройки», в колонке не стоит (ADR-188). */
  {
    href: '/admin/company',
    title: 'Компания',
    hint: 'Контакты, адрес, часы работы, реквизиты',
    icon: 'clients',
    roles: OWNER,
    place: 'settings',
  },
  {
    href: '/admin/prices',
    title: 'Цены на монтаж',
    hint: 'Прайс по классам и ставки допуслуг',
    icon: 'bill',
    roles: OWNER,
    place: 'settings',
  },
  {
    href: '/admin/notifications',
    title: 'Уведомления',
    hint: 'Куда уходит сообщение о новой заявке',
    icon: 'chat',
    roles: OWNER,
    place: 'settings',
  },

  /* Прибитый низ колонки: редкое и личное. Порядок — от общего к личному и
     дальше к необратимому, «Выйти» последним (ADR-188). */
  {
    href: ADMIN_SETTINGS_PATH,
    title: 'Настройки',
    hint: 'Компания, цены на монтаж и уведомления',
    icon: 'settings',
    roles: OWNER,
    place: 'bottom',
  },
  {
    href: '/admin/profile',
    title: 'Профиль',
    hint: 'Имя, телефон, пароль и тема интерфейса',
    icon: 'profile',
    roles: BOTH,
    place: 'bottom',
  },
];

export function sectionsFor(role: AdminRole): readonly AdminSection[] {
  return ADMIN_SECTIONS.filter((section) => section.roles.includes(role));
}

/**
 * Сколько разделов помещается в нижнюю панель телефона.
 *
 * 🔴 Пять целей — предел: шестая делает подписи нечитаемыми, а ширина цели на
 * экране 320 уходит ниже 44px. Пятая ячейка отдана «Ещё», поэтому разделов
 * здесь четыре.
 */
export const ADMIN_TABS = 4;

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
  /**
   * Ссылка на сам сайт: смотреть результат правки нужно постоянно.
   *
   * 🔴 В макете её нет ни на одном артборде, и это пробел макета, а не
   * решение (ADR-309, ADR-307 §4). Стоит внизу колонки, рядом с «Настройками»
   * и «Профилем»: отступление записано строкой в PIXEL_SPEC §«Панель».
   */
  site: 'Открыть сайт',
  logout: 'Выйти',
  navLabel: 'Разделы панели управления',
  /** Второй `<nav>` колонки: без своего имени читалка не отличит его от первого. */
  accountLabel: 'Настройки и профиль',
  /** Нижняя панель телефона: четыре раздела и «Ещё». */
  tabsLabel: 'Основные разделы',
  more: 'Ещё',
  moreTitle: 'Все разделы',
  settingsTitle: 'Настройки',
  settingsLead: 'Три страницы конфигурации: заполняются однажды и правятся редко',
  /** Кнопка колонки разделов: подпись меняется по состоянию. */
  navHide: 'Скрыть разделы',
  navShow: 'Показать разделы',
  /** Меню карточки вошедшего: подпись говорит, что произойдёт по нажатию. */
  accountOpen: 'Открыть меню профиля',
  accountClose: 'Закрыть меню профиля',
  accountMenuLabel: 'Профиль и выход',
} as const;

/**
 * Ошибка блока данных (issue #336).
 *
 * Заголовок называет раздел словами самого раздела, а не падежом от его
 * названия: «Не удалось загрузить раздел «Клиенты»» верно для любого имени,
 * а «загрузить клиенты» — нет. Объяснение про данные общее, но разделы, ради
 * которых в панель заходят с тревогой — заявки, наряды, отзывы, — называют
 * свои записи по имени: владелец смотрит на экран ровно затем, чтобы понять,
 * не потерялась ли заявка.
 */
const NOTE_BY_SECTION: Readonly<Record<string, string>> = {
  '/admin/leads':
    'Сервер не ответил. Заявки при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
  '/admin/orders':
    'Сервер не ответил. Наряды при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
  '/admin/reviews':
    'Сервер не ответил. Отзывы при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
};

export const blockErrorContent = {
  sectionTitle: (title: string): string => `Не удалось загрузить раздел «${title}»`,
  unknownSection: 'Раздел',
  unknownTitle: 'Не удалось загрузить раздел',
  note: 'Сервер не ответил. Данные при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.',
  noteBySection: NOTE_BY_SECTION,
  retry: 'Повторить',
  reload: 'Обновить страницу',
} as const;

/** Объяснение «что с данными» для адреса: у раздела своё, у остальных общее. */
export function blockErrorNote(pathname: string): string {
  const section = sectionOf(pathname);
  const own = section === undefined ? undefined : blockErrorContent.noteBySection[section.href];
  return own ?? blockErrorContent.note;
}
