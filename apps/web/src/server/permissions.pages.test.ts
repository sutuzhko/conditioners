// @vitest-environment node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PANEL_SECTION_PERMISSIONS } from '@/entities/staff/permissions';

import { pagePermissionRule, type PermissionRule } from './permissions';

/**
 * Контракт разрешений у страниц панели (ADR-344, issue #783).
 *
 * 🔴 Зачем отдельно от контракта ручек. Страница данные через свои же ручки не
 * запрашивает — она читает репозиторий серверным компонентом, и проверка API
 * про неё ничего не знает. Ровно по этой причине заведён и
 * `pages.contract.test.ts`: `/admin/orders` собирался под «любым вошедшим»,
 * пока `GET /api/admin/orders` стоял под перечнем ролей.
 *
 * 🔴 Проверяется не «что написано на странице», а **что ответит карта на её
 * адрес**. Требуемое разрешение страница о себе не объявляет: адрес приходит
 * заголовком от middleware, и решает по нему центральная карта. Поэтому здесь
 * обходится дерево страниц и каждому адресу задаётся тот же вопрос, что задаст
 * страж в рантайме.
 */
const PANEL_DIR = fileURLToPath(new URL('../app/(admin)/admin/(panel)', import.meta.url));

function pageFiles(dir: string, prefix = ''): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nested = join(dir, entry.name);
    if (entry.isDirectory()) {
      return pageFiles(nested, prefix === '' ? entry.name : `${prefix}/${entry.name}`);
    }

    return entry.name === 'page.tsx' ? [prefix] : [];
  });
}

/**
 * Адрес страницы в браузере — то, что придёт заголовком от middleware.
 *
 * Из пути в файловой системе выбрасывается всё, чего в адресе нет: группы
 * маршрутов `(panel)`, параллельные слоты `@modal` и перехват `(.)`. Сегмент
 * `[id]` становится значением: карта смотрит на форму адреса, а не на его
 * содержимое.
 */
function urlOf(pagePath: string): string {
  const segments = pagePath
    .split('/')
    .filter((segment) => segment !== '' && !segment.startsWith('@'))
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .map((segment) => segment.replace(/^\(\.+\)/, ''))
    .map((segment) => (segment.startsWith('[') ? 'x' : segment));

  return segments.length === 0 ? '/admin' : `/admin/${segments.join('/')}`;
}

const PAGES = pageFiles(PANEL_DIR);

function titleOf(rule: PermissionRule | null): string {
  if (rule === null) return 'нет в карте разрешений';
  if (rule.kind === 'always') return 'открыт всегда';
  if (rule.kind === 'owner') return 'только владелец';

  return rule.required.join(' + ');
}

describe('контракт разрешений: страницы панели', () => {
  it('🔴 в дереве панели есть страницы, и адрес каждой разобран', () => {
    expect({ pages: PAGES.length > 0, admin: urlOf('(panel)') }).toEqual({
      pages: true,
      admin: '/admin',
    });
  });

  it('🔴 у каждой страницы панели есть строка в центральной карте разрешений', () => {
    const uncovered = PAGES.filter((page) => pagePermissionRule(urlOf(page)) === null).map(urlOf);

    expect(uncovered).toEqual([]);
  });

  /**
   * Владельческое и открытое всегда — то, что читается глазами. Остальные
   * страницы закрыты разрешением своего раздела по первому сегменту адреса, и
   * выписывать их поштучно значило бы завести второй список страниц.
   */
  it('🔴 страницы вне разрешений разделов названы поимённо', () => {
    const special = Object.fromEntries(
      PAGES.map((page) => [urlOf(page), pagePermissionRule(urlOf(page))] as const)
        .filter(([, rule]) => rule === null || rule.kind !== 'permissions')
        .map(([url, rule]) => [url, titleOf(rule)]),
    );

    expect(special).toEqual({
      /* Указатель: своих данных за ним нет, он открывает «Компанию», «Цены» и
         «Уведомления» — каждая под своим разрешением. */
      '/admin/settings': 'открыт всегда',
      '/admin/profile': 'открыт всегда',
      /* 🔴 Журнал событий остаётся владельческим целиком (ADR-345): читать,
         кто что сделал, — это читать про себя в том числе. */
      '/admin/activity': 'только владелец',
    });
  });

  it('каждое разрешение раздела закрывает хотя бы одну страницу', () => {
    const used = new Set<string>();
    for (const page of PAGES) {
      const rule = pagePermissionRule(urlOf(page));
      if (rule !== null && rule.kind === 'permissions') {
        for (const permission of rule.required) used.add(permission);
      }
    }

    const unused = PANEL_SECTION_PERMISSIONS.filter((permission) => !used.has(permission));

    expect(unused).toEqual([]);
  });

  it('🔴 адрес вне панели карте неизвестен — и это отказ, а не пропуск', () => {
    expect([
      pagePermissionRule('/admin/unknown-section'),
      pagePermissionRule('/api/admin/leads'),
      pagePermissionRule('/knowledge'),
      pagePermissionRule(''),
    ]).toEqual([null, null, null, null]);
  });
});
