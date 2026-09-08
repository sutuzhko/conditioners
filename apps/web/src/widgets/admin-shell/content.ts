import type { AdminRole } from '@/entities/staff/model';
import type { AdminCounterKey, AdminCounts } from '@/shared/config/admin-counters';
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

/**
 * Заголовки тех же групп в листе «Ещё» на телефоне (issue #659).
 *
 * 🔴 Свой словарь, а не `ADMIN_GROUP_TITLES`. В колонке у «Работы» заголовка
 * нет намеренно: она идёт первой, и подпись только отодвигала бы вниз первый
 * же пункт. В листе всё иначе — первые четыре раздела остались во вкладках,
 * а здесь группа стоит рядом с двумя другими, и безымянная читается как
 * список, у которого подпись потеряли.
 */
export const ADMIN_SHEET_GROUP_TITLES: Readonly<Record<AdminSectionGroup, string>> = {
  work: 'Разделы',
  site: 'Сайт',
};

/** Подпись роли в карточке «кто вошёл». С заглавной: это подпись, а не часть фразы. */
export const ADMIN_ROLE_TITLES: Readonly<Record<AdminRole, string>> = {
  owner: 'Владелец',
  admin: 'Администратор',
  manager: 'Менеджер',
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

/* ---------- Кому раздел показывается — и кого по его адресу пускает
   раскладка панели.

   🔴 Перечни именованные, а не выписанные у каждого раздела. Раздел со своим
   списком ролей — это ещё одно место, где матрица доступа расходится сама с
   собой; четыре роли вместо двух делают расхождение почти неизбежным
   (ADR-344).

   🔴 Роль, которой в перечне нет, раздела не получает. Именно так, а не «все,
   кроме монтажника»: вычитание открывало бы каждую новую роль по умолчанию, и
   следующая роль въехала бы в чужие разделы молча. ---------- */

/**
 * Все роли. Список выписан, а не взят из `ADMIN_ROLES`, намеренно: `content.ts`
 * читает клиентская колонка панели, и значение из `entities/staff/model`
 * притащило бы в её бандл схемы Zod вместе с проверкой ИНН и словарём
 * оформления. Расхождение с настоящим перечнем ролей ловит тест рядом.
 */
const EVERYONE: readonly AdminRole[] = ['owner', 'admin', 'manager', 'installer'];

/** Рабочий экран выезда: календарь и наряды. Их ведёт монтажник, смотрит владелец. */
const FIELD: readonly AdminRole[] = ['owner', 'installer'];

/**
 * Жизненный цикл клиента: обращение — звонок — наряд (ADR-344).
 *
 * 🔴 Монтажника здесь нет и не будет: обращения и клиенты — персональные
 * данные, которых он по работе не касается (CRM §6).
 */
const CLIENT_CYCLE: readonly AdminRole[] = ['owner', 'admin', 'manager'];

const OWNER: readonly AdminRole[] = ['owner'];

/**
 * Роли раздела «Заявки» — тот же список, по которому страница раздела ставит
 * себе стража (issue #770).
 *
 * 🔴 Экспортируется именно затем, чтобы страница не завела свою копию: два
 * рубежа доступа — раскладка и сама страница (ADR-095) — обязаны считать по
 * одному списку, иначе один из них однажды окажется мягче другого.
 */
export const ADMIN_LEADS_ROLES = CLIENT_CYCLE;

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
    roles: FIELD,
    place: 'main',
    group: 'work',
  },
  {
    href: '/admin/orders',
    title: 'Заказы',
    hint: 'Наряды на монтаж, обслуживание и ремонт: кто едет, когда и за сколько',
    icon: 'orders',
    roles: FIELD,
    place: 'main',
    group: 'work',
    counter: 'orders',
  },
  {
    href: '/admin/leads',
    title: 'Заявки',
    hint: 'Обращения с сайта и их статусы',
    icon: 'leads',
    roles: ADMIN_LEADS_ROLES,
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
    roles: EVERYONE,
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

/**
 * Что лежит за «Ещё» на телефоне: разделы сверх четырёх вкладок и служебные
 * пункты.
 *
 * 🔴 Список собирается здесь, а не в двух компонентах порознь. По нему «Ещё»
 * решает сразу два вопроса — подсвечивать ли кнопку и есть ли повод её
 * открывать, — а лист рисует те же пункты. Разойдясь, они начали бы отвечать
 * про разные наборы разделов: кнопка про один, лист про другой.
 */
export function moreSectionsFor(role: AdminRole): readonly AdminSection[] {
  return [...columnSectionsFor(role).slice(ADMIN_TABS), ...bottomSectionsFor(role)];
}

/**
 * Что ждёт в очередях перечисленных разделов — словами, одной строкой:
 * «2 на модерации», «2 на модерации, 3 новых». `null` — не ждёт ничего.
 *
 * 🔴 Ноль ожиданием не считается, и это не то же правило, что в колонке. Там
 * ноль рисуется намеренно: «отзывов на модерации нет» — ответ, который
 * владелец смотрит каждое утро, стоя перед самим пунктом. На кнопке «Ещё»
 * тот же ноль означал бы «есть повод открыть» — признак, горящий всегда,
 * признаком быть перестаёт.
 *
 * Строка собирается из того же словаря, что подпись счётчика в колонке: голое
 * число озвучивается как «Ещё 2» и не отвечает, два чего.
 */
export function waitingTitleOf(
  sections: readonly AdminSection[],
  counts: AdminCounts | undefined,
): string | null {
  if (counts === undefined) return null;

  const parts = sections.flatMap((section) => {
    const key = section.counter;
    if (key === undefined) return [];

    const waiting = counts[key];
    return waiting === undefined || waiting === 0
      ? []
      : [`${waiting} ${ADMIN_COUNTER_TITLES[key]}`];
  });

  return parts.length === 0 ? null : parts.join(', ');
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
 * 🔴 Отдельной ветки «владелец проходит всегда» здесь больше нет, и это не
 * упрощение, а требование ADR-344: ролей четыре, и ответ на вопрос доступа
 * даёт перечень раздела, а не сравнение с одной привилегированной ролью.
 * Владелец назван в `roles` каждого раздела, поэтому проходит по общему
 * правилу — как все.
 *
 * 🔴 Адрес вне известных разделов проходит намеренно. Так живёт `/admin/activity`:
 * журнал событий заведён без пункта в колонке (Журнал · Фаза 1), и закрывает
 * его `requireOwnerPage()` на самой странице — второй рубеж ADR-095. Мягкость
 * этой строки — цена того, что новый раздел не обязан появляться в колонке
 * раньше, чем он готов; страж на странице при этом обязателен, и без него
 * незнакомый адрес окажется открыт любому вошедшему.
 */
export function sectionAllows(pathname: string, role: AdminRole): boolean {
  const section = sectionOf(pathname);
  if (section !== undefined) return section.roles.includes(role);

  return true;
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
  /**
   * Второй `<nav>` колонки: без своего имени читалка не отличит его от первого.
   * Он же — заголовок последней группы листа «Ещё»: на обоих экранах за этим
   * именем стоит одно и то же, и два разных названия пришлось бы сверять.
   */
  accountLabel: 'Настройки и профиль',
  /** Нижняя панель телефона: четыре раздела и «Ещё». */
  tabsLabel: 'Основные разделы',
  more: 'Ещё',
  /* 🔴 Заголовок листа повторяет подпись кнопки, которая его открыла. Прежние
     «Все разделы» отвечали только за первую половину: настройки, профиль,
     сайт, тема и выход разделами не являются, и заголовок обещал не то, что
     внутри (issue #659). За содержание отвечают заголовки групп. */
  moreTitle: 'Ещё',
  /** Подпись строки переключателя темы в листе: пилюля без неё — загадка. */
  themeLabel: 'Тема',
  /**
   * Ссылка на сайт открывается в новой вкладке, и об этом надо сказать: смена
   * контекста без предупреждения — типовая жалоба на скринридере.
   */
  siteNewTab: 'в новой вкладке',
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
