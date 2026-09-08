/**
 * Разрешения администратора: тринадцать разделов панели и пять опасных
 * действий (ADR-344, [CRM §6](../../../../../docs/CRM.md)).
 *
 * 🔴 Разрешения — это переключатели **владельца над администратором**, а не
 * вторая система ролей. Владелец, менеджер и монтажник ими не ограничены:
 * первый раздаёт права и потому под ними не ходит, у двух других доступ задан
 * перечнями `entities/staff/access` целиком. Спрашивают разрешения ровно у
 * одной роли — `admin`.
 *
 * 🔴 Переключатель на раздел, а не матрица «смотреть · править · удалять» на
 * каждый раздел. Матрица даёт под полсотни галочек, и владелец её не
 * прочитает, — а непрочитанная настройка доступа хуже отсутствующей: она
 * создаёт уверенность, что доступ настроен (ADR-344). Опасные действия
 * вынесены из разделов отдельным списком по той же причине: их пять, они
 * читаются с одного взгляда, и каждое отвечает на вопрос «что человек может
 * испортить необратимо».
 */
import { z } from 'zod';

/**
 * Тринадцать разделов панели.
 *
 * 🔴 Список повторяет разделы навигации (`widgets/admin-shell`) один в один,
 * кроме двух: страницы-указателя «Настройки» — за ней нет своих данных, она
 * открывает «Компанию», «Цены» и «Уведомления», у которых разрешения свои, —
 * и «Профиля», который есть у каждого вошедшего и переключателем не
 * закрывается. Совпадение держит не договорённость, а проверка:
 * `server/permissions.contract.test.ts` сверяет этот список с колонкой.
 *
 * 🔴 Импортировать сам список из навигации нельзя: `entities` не имеет права
 * знать про `widgets` (правило слоёв). Поэтому здесь значения, а в проверке —
 * сверка.
 */
export const PANEL_SECTION_PERMISSIONS = [
  'overview',
  'crm',
  'orders',
  'leads',
  'clients',
  'team',
  'stock',
  'catalog',
  'knowledge',
  'reviews',
  'company',
  'prices',
  'notifications',
] as const;

/**
 * Пять опасных действий — то, что нельзя починить правкой поля.
 *
 * Каждое требуется **сверх** разрешения на раздел: удалить обращение может
 * тот, кому открыты и «Заявки», и удаление данных. Раздел без опасного
 * действия остаётся рабочим экраном, с которого нельзя ничего снести.
 */
export const DANGEROUS_PERMISSIONS = [
  'data_delete',
  'money',
  'company_settings',
  'people',
  'activity_purge',
] as const;

const ALL_PERMISSIONS = [...PANEL_SECTION_PERMISSIONS, ...DANGEROUS_PERMISSIONS] as const;

export const adminPermissionSchema = z.enum(ALL_PERMISSIONS);

export type AdminPermission = z.infer<typeof adminPermissionSchema>;
export type PanelSectionPermission = (typeof PANEL_SECTION_PERMISSIONS)[number];
export type DangerousPermission = (typeof DANGEROUS_PERMISSIONS)[number];

export const ADMIN_PERMISSIONS: readonly AdminPermission[] = adminPermissionSchema.options;

export function isAdminPermission(value: string): value is AdminPermission {
  return ADMIN_PERMISSIONS.some((permission) => permission === value);
}

/**
 * Набор разрешений в теле запроса.
 *
 * Повторы схлопываются, порядок приводится к порядку словаря: набор — это
 * множество, и два одинаковых тела запроса обязаны давать одну и ту же строку
 * в базе. Иначе «ничего не изменилось» приходится выяснять сравнением
 * множеств у каждого читателя.
 */
export const adminPermissionsSchema = z
  .array(adminPermissionSchema)
  .max(ADMIN_PERMISSIONS.length, { message: 'Слишком много разрешений' })
  .transform(sortPermissions);

/** Набор в порядке словаря и без повторов. */
export function sortPermissions(values: readonly AdminPermission[]): AdminPermission[] {
  return ADMIN_PERMISSIONS.filter((permission) => values.includes(permission));
}

/** Одинаковы ли наборы. Порядок и повторы значения не имеют — это множества. */
export function samePermissions(
  left: readonly AdminPermission[],
  right: readonly AdminPermission[],
): boolean {
  const a = sortPermissions(left);
  const b = sortPermissions(right);

  return a.length === b.length && a.every((permission, index) => permission === b[index]);
}

/**
 * Подписи переключателей.
 *
 * 🔴 Это устройство системы, а не данные компании: разделы панели и опасные
 * действия придумывает не владелец, и инвариант 8 их из кода не выгоняет
 * (PRD «Роли и права», «Технические ограничения»).
 */
export const ADMIN_PERMISSION_TITLES: Readonly<Record<AdminPermission, string>> = {
  overview: 'Обзор',
  crm: 'Календарь работ',
  orders: 'Заказы',
  leads: 'Заявки',
  clients: 'Клиенты',
  team: 'Сотрудники',
  stock: 'Склад',
  catalog: 'Каталог',
  knowledge: 'База знаний',
  reviews: 'Отзывы',
  company: 'Компания',
  prices: 'Цены на монтаж',
  notifications: 'Уведомления',

  data_delete: 'Удаление данных',
  money: 'Деньги и выплаты',
  company_settings: 'Настройки компании',
  people: 'Управление людьми',
  activity_purge: 'Чистка журнала',
};

/** Что именно открывает переключатель — строкой под подписью. */
export const ADMIN_PERMISSION_HINTS: Readonly<Record<AdminPermission, string>> = {
  overview: 'Сводка: очереди, готовность сайта, деньги компании',
  crm: 'Замеры, монтажи, звонки и заявки по дням',
  orders: 'Наряды: кто едет, когда и за сколько',
  leads: 'Обращения с сайта и их статусы',
  clients: 'База людей: телефоны, адреса и история обращений',
  team: 'Команда: доступ в панель, телефоны, заметки',
  stock: 'Остатки материалов по зонам и приход',
  catalog: 'Модели, фотографии, характеристики, скидки',
  knowledge: 'Статьи и их публикация',
  reviews: 'Модерация: публикация и отклонение',
  company: 'Контакты, адрес, часы работы, реквизиты',
  prices: 'Прайс по классам и ставки допуслуг',
  notifications: 'Куда уходит сообщение о новой заявке',

  data_delete: 'Удалять заявку, клиента, наряд, модель, статью, отзыв, позицию склада',
  money: 'Править прайс монтажа, скидки и закупочные цены',
  company_settings: 'Менять контакты, реквизиты, часы работы и настройки сайта',
  people: 'Заводить сотрудников, менять их доступ и заметки о них',
  activity_purge: 'Чистить журнал событий за период',
};
