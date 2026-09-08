import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  APP_DIR,
  collectRoutes,
  compareWithBuild,
  CONTRACT_PATH,
  parseNextUnion,
  renderContract,
} from './routes-contract.mjs';

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Дерево `app/` из перечня файлов: ключ — путь, значение неважно. */
function appTree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'routes-app-'));
  dirs.push(dir);
  for (const file of files) {
    const path = join(dir, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, '');
  }
  return dir;
}

describe('копия контракта маршрутов (issue #883)', () => {
  it('🔴 файл в git собран из нынешнего дерева app/', () => {
    const routes = collectRoutes(APP_DIR);
    const expected = renderContract(routes);
    const actual = readFileSync(CONTRACT_PATH, 'utf8');

    if (actual !== expected) {
      /* Сообщение называет расхождение поимённо: копия, отставшая от `app/`,
         хуже отсутствующей — она даёт ложную уверенность, и разбираться
         придётся именно с адресами, а не с текстом файла. */
      const listed = (text, name) => {
        const start = text.indexOf(`type ${name}`);
        const end = text.indexOf(';', start);
        return new Set(
          start === -1
            ? []
            : (text.slice(start, end).match(/`[^`]+`/g) ?? []).map((s) => s.slice(1, -1)),
        );
      };
      const drift = [];
      for (const name of ['StaticRoutes', 'DynamicRoutes']) {
        const was = listed(actual, name);
        const now = listed(expected, name);
        for (const route of now) if (!was.has(route)) drift.push(`+ ${route}`);
        for (const route of was) if (!now.has(route)) drift.push(`− ${route}`);
      }
      expect(
        drift.length > 0 ? drift.join('\n') : 'текст копии разошёлся с генерацией',
        'копия контракта устарела: node scripts/routes-contract.mjs --write',
      ).toBe('');
    }
  });

  it('группы, слоты и приватные каталоги адресов не дают', () => {
    const dir = appTree([
      '(site)/page.tsx',
      '(site)/catalog/page.tsx',
      '(site)/_ui/page.tsx',
      '(admin)/admin/@modal/(.)new/page.tsx',
      '(admin)/admin/new/page.tsx',
    ]);
    expect(collectRoutes(dir)).toEqual({
      statics: ['/', '/admin/new', '/catalog'],
      dynamics: [],
    });
  });

  it('динамические сегменты пишутся шаблоном, как у Next', () => {
    const dir = appTree([
      'catalog/[slug]/page.tsx',
      'admin/[...rest]/page.tsx',
      'shop/[[...filters]]/page.tsx',
      'api/media/[name]/route.ts',
    ]);
    expect(collectRoutes(dir).dynamics).toEqual([
      '/admin/${CatchAllSlug<T>}',
      '/api/media/${SafeSlug<T>}',
      '/catalog/${SafeSlug<T>}',
      '/shop/${OptionalCatchAllSlug<T>}',
    ]);
  });

  it('🔴 тесты и соседние модули маршрутом не становятся', () => {
    const dir = appTree([
      'catalog/page.tsx',
      'catalog/page.test.tsx',
      'catalog/route.test.ts',
      'catalog/Card.tsx',
      'sitemap.ts',
    ]);
    expect(collectRoutes(dir)).toEqual({ statics: ['/catalog'], dynamics: [] });
  });

  it('🔴 сверка со сборкой называет и лишний адрес, и пропущенный', () => {
    /* Свидетель — сам Next: только его файл проверяет, что правила обхода
       дерева повторены верно, а не только применены одинаково. Сверка живёт
       в работе `check` после боевого образа, а не здесь: `.next` в дереве
       разработчика законно старше `app/`, и тест краснел бы на каждом новом
       маршруте до пересборки. */
    const generated = [
      '  type StaticRoutes = ',
      '    | `/`',
      '    | `/catalog`',
      '  type DynamicRoutes<T extends string = string> = ',
      '    | `/knowledge/${SafeSlug<T>}`',
      '',
      '  type RouteImpl<T> = ',
    ].join('\n');

    expect(parseNextUnion(generated, 'StaticRoutes')).toEqual(['/', '/catalog']);
    expect(compareWithBuild({ statics: ['/', '/catalog'], dynamics: [] }, generated)).toEqual([
      'DynamicRoutes: пропущен /knowledge/${SafeSlug<T>}',
    ]);
    expect(
      compareWithBuild({ statics: ['/', '/catalog', '/лишний'], dynamics: [] }, generated),
    ).toContain('StaticRoutes: лишний /лишний');
  });

  it('файл сборки без союзов — громкая ошибка, а не «всё сошлось»', () => {
    expect(compareWithBuild({ statics: [], dynamics: [] }, 'пусто')).toEqual([
      'в файле сборки нет союза StaticRoutes — формат Next изменился?',
      'в файле сборки нет союза DynamicRoutes — формат Next изменился?',
    ]);
  });
});
