/**
 * Центральная карта «маршрут → требуемое разрешение» (ADR-344, issue #783).
 *
 * 🔴 Карта одна и лежит здесь, а не аргументом у каждого маршрута. Проверка
 * разрешения — слой **поверх** проверки роли, и слой поверх обязан быть в
 * одном месте: тринадцать разделов и пять опасных действий читаются глазами по
 * одной таблице, а не обходом сорока файлов. Ровно тем же доводом заведён
 * `entities/staff/access`: перечень, выписанный по месту, — это второй
 * источник правды, а матрица доступа расходится сама с собой именно так.
 *
 * 🔴 Кого карта касается. Разрешения спрашивают у одной роли — `admin`.
 * Владелец их не спрашивает (он их и раздаёт), менеджеру и монтажнику доступ
 * задан перечнями ролей целиком. Поэтому у администратора **перечень ролей
 * маршрута не спрашивается вовсе**: администратор — это владелец под
 * переключателями (ADR-344), и отвечает за него эта карта.
 *
 * 🔴 Карта закрыта. Адрес, которого в ней нет, администратору не открывается
 * (`null` → отказ), а контрактные проверки рядом краснеют: новый маршрут,
 * забывший строку здесь, обнаруживается прогоном, а не отказом у владельца.
 */
import type { AdminPermission } from '@/entities/staff/permissions';
import type { AdminRole } from '@/entities/staff/model';

/** Что требуется администратору, чтобы пройти. */
export type PermissionRule =
  /** Открыт всегда: свой профиль, свой пароль. Переключателем не закрывается. */
  | { readonly kind: 'always' }
  /** Не открывается никаким переключателем: раздача прав и журнал событий. */
  | { readonly kind: 'owner' }
  /** Открыт, когда владелец выдал **все** перечисленные разрешения. */
  | { readonly kind: 'permissions'; readonly required: readonly AdminPermission[] };

const ALWAYS: PermissionRule = { kind: 'always' };
const OWNER_ONLY: PermissionRule = { kind: 'owner' };

function needs(...required: readonly AdminPermission[]): PermissionRule {
  return { kind: 'permissions', required };
}

/* ---------- Ручки `/api/admin/*` ---------- */

/**
 * Раздел, которому принадлежит ручка, — по первому сегменту адреса.
 *
 * 🔴 По сегменту, а не построчно по каждому методу: сорок с лишним маршрутов
 * панели раскладываются по разделам без остатка, и таблица из пятнадцати строк
 * читается целиком, а таблица из полутора сотен — нет. Всё, что из этого
 * правила выпадает, стоит ниже отдельным списком и потому заметно.
 */
const API_SECTIONS: Readonly<Record<string, PermissionRule>> = {
  articles: needs('knowledge'),
  /* Отлучки монтажника заводятся и видны в календаре — это его раздел. */
  blocks: needs('crm'),
  clients: needs('clients'),
  crm: needs('crm'),
  leads: needs('leads'),
  models: needs('catalog'),
  notifications: needs('notifications'),
  orders: needs('orders'),
  prices: needs('prices'),
  /* Свой профиль, свой пароль, свой выход со всех устройств. */
  profile: ALWAYS,
  /**
   * 🔴 Ручная ревалидация остаётся владельческой. Данных она не меняет, но
   * сбрасывает кеш публичных страниц — то есть перестраивает витрину; своего
   * переключателя у неё нет, а привязать её к разделу нельзя: она принимает
   * произвольный список адресов сайта, а не адреса одного раздела.
   */
  revalidate: OWNER_ONLY,
  reviews: needs('reviews'),
  /* Ключ-значение настроек — данные страницы «Компания». */
  settings: needs('company'),
  staff: needs('team'),
  stock: needs('stock'),
};

/**
 * Исключения из правила «раздел по первому сегменту»: опасные действия и та
 * пара ручек, что обслуживает чужой раздел.
 *
 * Ключ — шаблон адреса без `/api/admin/` и метод; `*` — один любой сегмент.
 * Значение — требование **целиком**, а не добавка к разделу: так строка
 * читается сама по себе, без сверки с таблицей выше.
 *
 * 🔴 «Удаление данных» стоит на удалении **записи раздела** — обращения,
 * клиента, наряда, модели, статьи, отзыва, позиции склада, — а не на удалении
 * вложенного файла, строки чеклиста или списанного материала. Иначе
 * переключатель закрывал бы обычную дневную работу, и владелец выдавал бы его
 * всем, то есть не выдавал бы никому.
 */
const API_OVERRIDES: Readonly<Record<string, PermissionRule>> = {
  /* Удаление данных. */
  'leads/* DELETE': needs('leads', 'data_delete'),
  'clients/* DELETE': needs('clients', 'data_delete'),
  'orders/* DELETE': needs('orders', 'data_delete'),
  'crm/* DELETE': needs('crm', 'data_delete'),
  'models/* DELETE': needs('catalog', 'data_delete'),
  'articles/* DELETE': needs('knowledge', 'data_delete'),
  'reviews/* DELETE': needs('reviews', 'data_delete'),
  'stock/items/* DELETE': needs('stock', 'data_delete'),
  'stock/zones/* DELETE': needs('stock', 'data_delete'),
  /* 🔴 Отлучка (`blocks/* DELETE`) «Удаления данных» не требует, и это выбор,
     а не пропуск: свою отлучку человек снимает каждый день — передумал ехать
     в отпуск, перенёс приём у врача. Переключатель, который для этого нужен,
     выдавали бы всем, а его смысл — редкое и необратимое. Снять чужую отлучку
     нельзя и без него: выборку сужает `listBlocks(viewer)`. */

  /* Деньги: суммы, которые видит клиент, и закупочные цены.

     🔴 Заведение и правка модели тоже здесь, а не в одном «Каталоге». Тело
     карточки везёт `priceNum` — цену на публичной витрине, ту самую, которую
     перечёркивает скидка. Закрыть скидку и оставить открытой исходную цену
     значит закрыть половину замка: поднять цену правкой карточки — ровно тот
     приём, который сайт разоблачает в разделе «Как обманывают при установке»
     (красная линия «не врать в цене», инвариант 14). */
  'prices PUT': needs('prices', 'money'),
  'models POST': needs('catalog', 'money'),
  'models/* PUT': needs('catalog', 'money'),
  'models/* PATCH': needs('catalog', 'money'),
  'models/*/sale PATCH': needs('catalog', 'money'),
  'stock/items POST': needs('stock', 'money'),
  'stock/items/* PATCH': needs('stock', 'money'),

  /* 🔴 Две ручки обращения заводят записи чужого раздела, и разрешения на
     «Заявки» им мало. `POST /leads/{id}/client` заводит карточку клиента — а
     при совпадении телефона возвращает **уже заведённую**, со всей историей
     обращений, то есть отдаёт содержимое закрытого раздела (`repo/clients`).
     `POST /leads/{id}/order` заводит клиента и наряд разом. */
  'leads/*/client POST': needs('leads', 'clients'),
  'leads/*/order POST': needs('leads', 'clients', 'orders'),

  /* Настройки компании: реквизиты, контакты, часы, разметка сайта. */
  'settings/* PUT': needs('company', 'company_settings'),
  /**
   * Готовность сайта — плитка «Обзора», а не страница «Компании». Адрес у
   * неё чужой: она читает те же настройки и потому лежит под ними.
   */
  'settings/readiness GET': needs('overview'),

  /* Управление людьми. */
  'staff POST': needs('team', 'people'),
  'staff/* PATCH': needs('team', 'people'),
  'staff/* DELETE': needs('team', 'people', 'data_delete'),
  'staff/*/notes POST': needs('team', 'people'),
  'staff/*/notes/* DELETE': needs('team', 'people'),

  /**
   * 🔴 Роли и разрешения раздаёт только владелец — никаким переключателем это
   * не открывается (ADR-344, issue #784, #785). Администратор, правящий права,
   * означает ровно то, что переключатели владельца — договорённость.
   */
  'staff/*/access PATCH': OWNER_ONLY,
};

/* ---------- Страницы панели ---------- */

/**
 * Раздел страницы — по первому сегменту после `/admin`.
 *
 * Пустой сегмент — сам `/admin`, то есть «Обзор».
 */
const PAGE_SECTIONS: Readonly<Record<string, PermissionRule>> = {
  '': needs('overview'),
  crm: needs('crm'),
  orders: needs('orders'),
  leads: needs('leads'),
  clients: needs('clients'),
  team: needs('team'),
  stock: needs('stock'),
  catalog: needs('catalog'),
  knowledge: needs('knowledge'),
  reviews: needs('reviews'),
  company: needs('company'),
  prices: needs('prices'),
  notifications: needs('notifications'),
  /**
   * Страница-указатель: своих данных за ней нет, она открывает «Компанию»,
   * «Цены» и «Уведомления». Закрывать её переключателем не за чем — три
   * страницы, на которые она ведёт, закрыты своими.
   */
  settings: ALWAYS,
  profile: ALWAYS,
  /**
   * 🔴 Журнал событий остаётся владельческим целиком (ADR-345). Читать, кто
   * что сделал, — это читать про себя в том числе; администратору журнал не
   * открывается, а чистка его отдельным разрешением ещё и не привязана ни к
   * одной ручке: чистки в коде пока нет (Журнал · Фаза 2).
   */
  activity: OWNER_ONLY,
};

const API_PREFIX = '/api/admin';
const PAGE_PREFIX = '/admin';

/** Сегменты адреса без пустых краёв: `/admin/team/` → `['team']`. */
function segmentsOf(pathname: string, prefix: string): readonly string[] | null {
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;

  return pathname.slice(prefix.length).split('/').filter(Boolean);
}

/** Совпадает ли адрес с шаблоном, где `*` — один любой сегмент. */
function matches(pattern: readonly string[], segments: readonly string[]): boolean {
  if (pattern.length !== segments.length) return false;

  return pattern.every((part, index) => part === '*' || part === segments[index]);
}

const OVERRIDES: readonly {
  readonly pattern: readonly string[];
  readonly method: string;
  readonly rule: PermissionRule;
}[] = Object.entries(API_OVERRIDES).map(([key, rule]) => {
  const [path = '', method = ''] = key.split(' ');
  return { pattern: path.split('/'), method, rule };
});

/**
 * Что требуется администратору на этой ручке. `null` — карта про адрес не
 * знает, и это отказ: разрешение по умолчанию не выдаётся.
 */
export function apiPermissionRule(pathname: string, method: string): PermissionRule | null {
  const segments = segmentsOf(pathname, API_PREFIX);
  if (segments === null || segments.length === 0) return null;

  const override = OVERRIDES.find(
    (candidate) => candidate.method === method && matches(candidate.pattern, segments),
  );
  if (override !== undefined) return override.rule;

  return sectionRule(API_SECTIONS, segments[0] ?? '');
}

/**
 * Правило раздела по имени сегмента.
 *
 * 🔴 `Object.hasOwn`, а не `map[key] ?? null`. Адрес приходит снаружи, и
 * сегментом бывает `toString`, `constructor`, `__proto__`: обычный доступ
 * находит их в прототипе объекта, `??` не срабатывает — и вместо честного
 * отказа наружу уезжает функция, на которой падает разбор правила. Опечатка в
 * адресе не должна давать пятисотку.
 */
function sectionRule(
  sections: Readonly<Record<string, PermissionRule>>,
  segment: string,
): PermissionRule | null {
  return Object.hasOwn(sections, segment) ? (sections[segment] ?? null) : null;
}

/** То же для страницы панели. `null` — адрес карте неизвестен, значит отказ. */
export function pagePermissionRule(pathname: string): PermissionRule | null {
  const segments = segmentsOf(pathname, PAGE_PREFIX);
  if (segments === null) return null;

  return sectionRule(PAGE_SECTIONS, segments[0] ?? '');
}

/**
 * Набор разрешений сессии. Нет набора — нет разрешений (fail-closed).
 *
 * 🔴 Живёт здесь, а не в `server/auth`, и это не вкусовщина. `auth` подменяют
 * целиком полтора десятка проверок маршрутов — они про доступ к данным, а не
 * про сессию, — и каждая такая подмена молча забирала бы у стража функцию,
 * без которой он падает. Модуль разрешений не подменяет никто: он и есть
 * предмет проверки.
 *
 * Сессия принимается структурно, а не типом `AdminSession`: так модуль не
 * тянет `server/auth`, который через `repo/admin-users` тянет `server/http` —
 * а `http` импортирует эту карту (ADR-149, тот же круг импортов).
 */
export function permissionsOf(session: {
  readonly permissions?: readonly AdminPermission[] | undefined;
}): readonly AdminPermission[] {
  return session.permissions ?? [];
}

/** Проходит ли администратор с этим набором разрешений. */
export function rulePasses(
  rule: PermissionRule | null,
  permissions: readonly AdminPermission[],
): boolean {
  if (rule === null || rule.kind === 'owner') return false;
  if (rule.kind === 'always') return true;

  return rule.required.every((permission) => permissions.includes(permission));
}

/**
 * Кто отвечает на вопрос доступа — перечень ролей или карта разрешений.
 *
 * 🔴 У администратора перечень ролей не спрашивается. Он не «ещё одна роль в
 * списке»: ADR-344 даёт ему права владельца под переключателями, и спрашивать
 * заодно перечень значило бы, что выданное разрешение всё равно не работает,
 * пока роль не вписали в `entities/staff/access` — то есть переключатель
 * владельца ничего не решает.
 */
export function accessAllows(params: {
  readonly role: AdminRole;
  readonly permissions: readonly AdminPermission[];
  readonly roles: readonly AdminRole[];
  readonly rule: PermissionRule | null;
}): boolean {
  if (params.role !== 'admin') return params.roles.includes(params.role);

  return rulePasses(params.rule, params.permissions);
}

/**
 * Пускать ли администратора по этому адресу панели.
 *
 * Отдельная функция ради внешней раскладки панели: она сверяет доступ до
 * первого байта ответа (ADR-095) и до этого спрашивала только перечень ролей
 * раздела — то есть для администратора отвечала «нет» независимо от того, что
 * ему выдал владелец.
 */
export function adminPageAllows(
  pathname: string,
  permissions: readonly AdminPermission[],
): boolean {
  return rulePasses(pagePermissionRule(pathname), permissions);
}
