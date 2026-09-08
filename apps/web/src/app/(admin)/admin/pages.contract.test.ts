// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ROLE_LIST_NAMES, type RoleListName } from '@/entities/staff/access';

/**
 * Контракт ролей страниц панели: у каждой странице свой перечень ролей.
 *
 * 🔴 Зачем отдельно от контракта API. Страница панели данные не запрашивает
 * через свои же ручки — она читает репозиторий напрямую, серверным
 * компонентом. Поэтому разграничение у неё своё, и проверка ручек про неё
 * ничего не знает: `/admin/orders` собирался под `requirePage()` — «любой
 * вошедший», — пока `GET /api/admin/orders` стоял под перечнем ролей.
 *
 * 🔴 Почему по исходнику, а не вызовом страницы. Серверный компонент нельзя
 * вызвать вне рендера Next: `requireRolePage` бросает `forbidden()` из
 * `next/navigation`, а тот работает только внутри запроса. Здесь проверяется
 * то, что проверить можно и нужно: **у страницы есть строка проверки роли, и
 * это тот перечень, который ей положен**. Что перечень исполняется — доказано
 * в `server/guards.test.ts`, где стражи проверены на всех четырёх ролях.
 *
 * 🔴 Проверка на самой странице, а не в раскладке — ADR-095. Раскладка панели
 * тоже сверяет роль (`sectionAllows`), но она успевает только сменить код
 * ответа: React рисует страницу параллельно, и та уходит в базу и отдаёт
 * данные в теле ответа. Браузер их выбрасывает, `curl` — нет. Поэтому строка
 * стража стоит первой в самой странице, и её отсутствие — дефект, а не
 * недосмотр.
 *
 * Источник истины — [CRM §6](../../../../../docs/CRM.md) и
 * [API.md §17](../../../../../docs/API.md).
 */
const EXPECTED: Readonly<Record<string, RoleListName>> = {
  /* Сводка: готовность сайта, очереди модерации, деньги компании. */
  '(panel)': 'OWNER',

  /* Выездная работа. Менеджера здесь нет до фазы 3 плана «Роли и права»:
     наряд везёт вознаграждение исполнителя и удержания. */
  '(panel)/crm': 'FIELD',
  '(panel)/orders': 'FIELD',
  '(panel)/orders/[id]': 'FIELD',
  '(panel)/orders/[id]/handover': 'FIELD',
  /* Правка наряда — владельческая, как и `PATCH` со схемой владельца:
     монтажник меняет только статус, и делает это с карточки. */
  '(panel)/orders/[id]/edit': 'OWNER',
  '(panel)/orders/new': 'OWNER',
  '(panel)/orders/@modal/(.)new': 'OWNER',

  /* Клиентский цикл: обращение — звонок — наряд (ADR-344). */
  '(panel)/leads': 'CLIENT_CYCLE',

  /* Персональные данные и люди компании. */
  '(panel)/clients': 'OWNER',
  '(panel)/clients/[id]': 'OWNER',
  '(panel)/clients/new': 'OWNER',
  '(panel)/clients/@modal/(.)new': 'OWNER',
  '(panel)/team': 'OWNER',
  '(panel)/team/[id]': 'OWNER',
  '(panel)/team/new': 'OWNER',
  '(panel)/team/@modal/(.)new': 'OWNER',

  /* Разделы про сайт: витрина, цены, статьи, отзывы. */
  '(panel)/catalog': 'OWNER',
  '(panel)/catalog/[id]': 'OWNER',
  '(panel)/catalog/new': 'OWNER',
  '(panel)/catalog/@modal/(.)new': 'OWNER',
  '(panel)/catalog/specs': 'OWNER',
  '(panel)/knowledge': 'OWNER',
  '(panel)/knowledge/[id]': 'OWNER',
  '(panel)/knowledge/new': 'OWNER',
  '(panel)/knowledge/@modal/(.)new': 'OWNER',
  '(panel)/reviews': 'OWNER',

  /* Склад: остатки правит владелец, монтажник списывает из карточки наряда. */
  '(panel)/stock': 'OWNER',
  '(panel)/stock/items/[id]': 'OWNER',
  '(panel)/stock/items/new': 'OWNER',
  '(panel)/stock/move': 'OWNER',
  '(panel)/stock/@modal/(.)items/new': 'OWNER',
  '(panel)/stock/@modal/(.)move': 'OWNER',
  '(panel)/stock/@modal/(.)zones/new': 'OWNER',
  '(panel)/stock/zones/new': 'OWNER',
  /* Прежние адреса вкладок: разворачивают на раздел, но роль сверяют до
     разворота — адрес, отвечающий 307 кому угодно, рассказывает, что раздел
     существует (issue #352, #773). */
  '(panel)/stock/journal': 'OWNER',
  '(panel)/stock/zones': 'OWNER',

  /* Конфигурация и журнал событий. */
  '(panel)/settings': 'OWNER',
  '(panel)/company': 'OWNER',
  '(panel)/prices': 'OWNER',
  '(panel)/notifications': 'OWNER',
  '(panel)/activity': 'OWNER',

  /* Свой профиль есть у каждого, кто вошёл. */
  '(panel)/profile': 'EVERYONE',
};

/**
 * Страницы без проверки роли — с причиной, по которой её там нет.
 *
 * 🔴 Список закрытый и разбирается наравне с матрицей: страница, оказавшаяся
 * без стража, обязана быть **названа** здесь, а не просто отсутствовать в
 * таблице. Пустое место читается как «забыли», а запись — как решение, и
 * следующая сессия видит разницу.
 */
const NO_ROLE_RULE: Readonly<Record<string, string>> = {
  /* Ловушка несуществующих адресов панели (issue #631). Роли сверять не с чем:
     раздела нет. Отказ вместо «не найдено» ещё и соврал бы — он значит «есть,
     но не для вас». */
  '(missing)/[...rest]': 'адреса нет: страница бросает 404',
  /* Форма входа: до входа роли не существует. */
  login: 'вход в панель — до сессии',
};

const ADMIN_DIR = fileURLToPath(new URL('.', import.meta.url));

/**
 * 🔴 Обход дерева файловой системой — та половина проверки, ради которой она и
 * написана: страница появляется в проекте как файл `page.tsx`, и никакого
 * перечня, куда её надо было бы вписать, в Next не существует. Поэтому «что
 * вообще есть» спрашивают у каталога, а не у списка импортов, и новая страница
 * попадает в проверку сама.
 */
function pageFiles(dir: string, prefix = ''): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nested = join(dir, entry.name);
    if (entry.isDirectory()) {
      return pageFiles(nested, prefix === '' ? entry.name : `${prefix}/${entry.name}`);
    }

    return entry.name === 'page.tsx' ? [prefix] : [];
  });
}

/** Что стоит на месте перечня, когда его нет или он не тот. */
type Missing = 'без проверки роли' | 'перечень не из entities/staff/access' | 'перечни разошлись';

const GUARD = /await\s+(requireOwnerPage|requirePage|requireRolePage)\(\s*([A-Za-z_]+)?/g;

/**
 * Какой перечень ролей стоит на странице.
 *
 * `requireOwnerPage()` и `requirePage()` — сокращения самых частых перечней
 * (`OWNER` и `EVERYONE`), заведённые затем, чтобы не повторять их в шестидесяти
 * файлах; разворачиваются здесь.
 */
function guardOf(pagePath: string): RoleListName | Missing {
  const source = readFileSync(join(ADMIN_DIR, pagePath, 'page.tsx'), 'utf8');

  const found = [...source.matchAll(GUARD)].map(([, guard, argument]): RoleListName | Missing => {
    if (guard === 'requireOwnerPage') return 'OWNER';
    if (guard === 'requirePage') return 'EVERYONE';

    const name = ROLE_LIST_NAMES.find((known) => known === argument);
    return name ?? 'перечень не из entities/staff/access';
  });

  const first = found[0];
  if (first === undefined) return 'без проверки роли';

  /* Страница вызывает стража дважды — в `generateMetadata` и в себе самой, и
     это правильно: заголовок собирается из тех же данных. Разошедшиеся
     перечни означали бы, что заголовок читают по одному правилу, а страницу
     по другому. */
  return found.every((name) => name === first) ? first : 'перечни разошлись';
}

const tree = pageFiles(ADMIN_DIR);
const actual: Record<string, RoleListName | Missing> = {};
for (const path of tree) actual[path] = guardOf(path);

const guarded = Object.fromEntries(
  Object.entries(actual).filter(([path]) => !(path in NO_ROLE_RULE)),
);

describe('контракт ролей: страницы панели', () => {
  it('🔴 у каждой страницы панели тот перечень ролей, который положен ей по CRM §6', () => {
    /* Сравниваем целиком, а не по одному ключу: так падение показывает разом
       все разъехавшиеся страницы, а не первую попавшуюся. */
    expect(guarded).toEqual(EXPECTED);
  });

  it('🔴 ни одна страница панели не осталась вовсе без проверки роли', () => {
    const unguarded = Object.entries(actual)
      .filter(([, name]) => name === 'без проверки роли')
      .map(([path]) => path);

    expect(unguarded).toEqual(Object.keys(NO_ROLE_RULE));
  });

  it('🔴 ни одна страница не выписывает роли массивом по месту', () => {
    const inline = Object.entries(actual)
      .filter(([, name]) => name === 'перечень не из entities/staff/access')
      .map(([path]) => path);

    expect(inline).toEqual([]);
  });

  it('🔴 страница со стражем в двух местах зовёт его с одним перечнем', () => {
    const split = Object.entries(actual)
      .filter(([, name]) => name === 'перечни разошлись')
      .map(([path]) => path);

    expect(split).toEqual([]);
  });

  it('новая страница панели обязана появиться в таблице ролей', () => {
    const missing = tree.filter((path) => !(path in EXPECTED) && !(path in NO_ROLE_RULE));

    expect(missing).toEqual([]);
  });

  it('таблица не описывает страниц, которых больше нет', () => {
    const known = [...Object.keys(EXPECTED), ...Object.keys(NO_ROLE_RULE)];
    const stale = known.filter((path) => !tree.includes(path));

    expect(stale).toEqual([]);
  });
});
