#!/usr/bin/env node
/**
 * Копия контракта типизированных маршрутов Next в репозитории (issue #883).
 *
 * 🔴 Зачем копия. Типы `typedRoutes` Next генерирует в `.next/types` при
 * сборке, а в рабочем дереве `.next` может не быть вовсе — тогда
 * `next/dist/types.d.ts` отдаёт заглушку `Route = string & {}`, и `tsc` этого
 * класса ошибок **не видит в принципе** (ADR-147 описывал частный случай, а
 * дело шире). 8 сентября боевая сборка дважды упала на `router.push` со
 * строкой и на литералах `'20'` в `href` — обе правки прошли `pnpm check`
 * начисто и стоили двух прогонов по десять минут.
 *
 * Копия компилируется обычным `tsc` через `apps/web/tsconfig.routes.json`,
 * который берёт те же исходники, но вместо `.next/types` подставляет этот
 * файл. Секунды вместо прогона — и в любом дереве, собранном или нет.
 *
 * 🔴 Копия обязана расходиться с `app/` громко. Список адресов, отставший от
 * дерева маршрутов, хуже отсутствующего: он даёт ложную уверенность. Поэтому
 * файл не пишется руками, а **собирается из дерева `app/`**, лежит в git и
 * сверяется тестом (`scripts/routes-contract.test.mjs`) — тот же приём, что у
 * карты ярлыков `.github/labeler.yml`.
 *
 * Запуск:
 *   node scripts/routes-contract.mjs                      → печатает содержимое
 *   node scripts/routes-contract.mjs --write              → записывает копию
 *   node scripts/routes-contract.mjs --witness <link.d.ts> → сверяет с тем,
 *       что при сборке написал сам Next (шаг работы `check` после образа)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Дерево маршрутов приложения — источник правды для копии. */
export const APP_DIR = join(ROOT, 'apps/web/src/app');

/** Путь к сгенерированной копии; сюда смотрит тест и `tsconfig.routes.json`. */
export const CONTRACT_PATH = join(ROOT, 'apps/web/types/routes-contract.d.ts');

/** Расширения, которые Next считает модулем страницы или обработчика. */
const ROUTE_FILE = /^(page|route)\.(tsx?|jsx?|mjs)$/;

const DYNAMIC = /^\[(\.\.\.)?([^\].]+)\]$/;
const OPTIONAL_CATCH_ALL = /^\[\[\.\.\.([^\].]+)\]\]$/;

/**
 * Как сегмент каталога участвует в адресе.
 *
 * 🔴 Правила скопированы у Next, и каждое из них — причина, по которой копию
 * нельзя собрать простым обходом каталогов:
 * - `(группа)` в адрес не входит — это только про раскладку;
 * - `@слот` и всё под ним адресов не даёт: параллельный маршрут рисуется в
 *   родителе, а перехват `(.)new` внутри слота — это тот же `/new`, а не
 *   второй адрес;
 * - `_приватный` каталог Next не обходит вовсе.
 */
function segmentKind(name) {
  if (name.startsWith('_') || name.startsWith('@')) return { kind: 'skip-subtree' };
  if (name.startsWith('(') && name.endsWith(')')) return { kind: 'invisible' };
  const optional = OPTIONAL_CATCH_ALL.exec(name);
  if (optional !== null) return { kind: 'dynamic', slug: 'OptionalCatchAllSlug' };
  const dynamic = DYNAMIC.exec(name);
  if (dynamic !== null) {
    return { kind: 'dynamic', slug: dynamic[1] === undefined ? 'SafeSlug' : 'CatchAllSlug' };
  }
  return { kind: 'static' };
}

/**
 * Адреса дерева `app/`: статические строками, динамические — шаблонами в том
 * же виде, в каком их пишет Next.
 */
export function collectRoutes(appDir) {
  const statics = new Set();
  const dynamics = new Set();

  const walk = (dir, segments, hasDynamic) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    if (entries.some((entry) => entry.isFile() && ROUTE_FILE.test(entry.name))) {
      const route = segments.length === 0 ? '/' : `/${segments.join('/')}`;
      (hasDynamic ? dynamics : statics).add(route);
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const step = segmentKind(entry.name);
      if (step.kind === 'skip-subtree') continue;
      const next = join(dir, entry.name);
      if (step.kind === 'invisible') {
        walk(next, segments, hasDynamic);
      } else if (step.kind === 'dynamic') {
        walk(next, [...segments, `\${${step.slug}<T>}`], true);
      } else {
        walk(next, [...segments, entry.name], hasDynamic);
      }
    }
  };

  walk(appDir, [], false);

  const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return { statics: [...statics].sort(order), dynamics: [...dynamics].sort(order) };
}

/**
 * Текст копии контракта. Форма повторяет `.next/types/link.d.ts` Next 15.5:
 * тот же служебный namespace, те же дополнения модулей `next`, `next/link`,
 * `next/navigation` и `next/form`. Расходиться с ним нельзя — иначе проверка
 * ловила бы не то, что ловит сборка.
 */
export function renderContract({ statics, dynamics }) {
  /* Союз пишется ровно так, как его отформатировал бы Prettier: файл лежит в
     git и проходит общий `format:check`, а переформатировать сгенерированное
     руками нельзя — тест сверяет файл с генерацией байт в байт. */
  const union = (routes) =>
    routes
      .map((route, index) => `    | \`${route}\`${index === routes.length - 1 ? ';' : ''}`)
      .join('\n');

  return (
    `// Копия контракта типизированных маршрутов Next (issue #883).
//
// 🔴 Файл собирается из дерева apps/web/src/app командой
//    node scripts/routes-contract.mjs --write
// Правки руками теряются при следующей сборке; тест сверяет файл в git с
// генерацией и краснеет на расхождении.
//
// Зачем: типы typedRoutes живут в .next/types, которого в рабочем дереве
// может не быть — и тогда tsc не видит целого класса ошибок. Эта копия
// подставляется вместо .next/types в apps/web/tsconfig.routes.json.
//
// 🔴 Ссылки ниже заменяют next-env.d.ts, который эта проверка не берёт:
// он тянет ./.next/types/routes.d.ts, а весь смысл копии в том, чтобы
// работать без .next. Без ссылок пропадут типы CSS-модулей и картинок.

/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace __next_route_internal_types__ {
  type SearchOrHash = \`?\${string}\` | \`#\${string}\`;
  type WithProtocol = \`\${string}:\${string}\`;

  type Suffix = '' | SearchOrHash;

  type SafeSlug<S extends string> = S extends \`\${string}/\${string}\`
    ? never
    : S extends \`\${string}\${SearchOrHash}\`
      ? never
      : S extends ''
        ? never
        : S;

  type CatchAllSlug<S extends string> = S extends \`\${string}\${SearchOrHash}\`
    ? never
    : S extends ''
      ? never
      : S;

  type OptionalCatchAllSlug<S extends string> = S extends \`\${string}\${SearchOrHash}\` ? never : S;

  type StaticRoutes =
` +
    union(statics) +
    `

  type DynamicRoutes<T extends string = string> =
` +
    union(dynamics) +
    `

  type RouteImpl<T> =
    | StaticRoutes
    | SearchOrHash
    | WithProtocol
    | \`\${StaticRoutes}\${SearchOrHash}\`
    | (T extends \`\${DynamicRoutes<infer _>}\${Suffix}\` ? T : never);
}

declare module 'next' {
  export { default } from 'next/types.js';
  export * from 'next/types.js';

  export type Route<T extends string = string> = __next_route_internal_types__.RouteImpl<T>;
}

declare module 'next/link' {
  export { useLinkStatus } from 'next/dist/client/link.js';

  import type { LinkProps as OriginalLinkProps } from 'next/dist/client/link.js';
  import type { AnchorHTMLAttributes, DetailedHTMLProps } from 'react';
  import type { UrlObject } from 'url';

  type LinkRestProps = Omit<
    Omit<
      DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>,
      keyof OriginalLinkProps
    > &
      OriginalLinkProps,
    'href'
  >;

  export type LinkProps<RouteInferType> = LinkRestProps & {
    href: __next_route_internal_types__.RouteImpl<RouteInferType> | UrlObject;
  };

  export default function Link<RouteType>(props: LinkProps<RouteType>): JSX.Element;
}

declare module 'next/navigation' {
  export * from 'next/dist/client/components/navigation.js';

  import type {
    NavigateOptions,
    AppRouterInstance as OriginalAppRouterInstance,
  } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
  import type { RedirectType } from 'next/dist/client/components/redirect-error.js';

  interface AppRouterInstance extends OriginalAppRouterInstance {
    push<RouteType>(
      href: __next_route_internal_types__.RouteImpl<RouteType>,
      options?: NavigateOptions,
    ): void;
    replace<RouteType>(
      href: __next_route_internal_types__.RouteImpl<RouteType>,
      options?: NavigateOptions,
    ): void;
    prefetch<RouteType>(href: __next_route_internal_types__.RouteImpl<RouteType>): void;
  }

  export function useRouter(): AppRouterInstance;

  export function redirect<RouteType>(
    url: __next_route_internal_types__.RouteImpl<RouteType>,
    type?: RedirectType,
  ): never;

  export function permanentRedirect<RouteType>(
    url: __next_route_internal_types__.RouteImpl<RouteType>,
    type?: RedirectType,
  ): never;
}

declare module 'next/form' {
  import type { FormProps as OriginalFormProps } from 'next/dist/client/form.js';

  type FormRestProps = Omit<OriginalFormProps, 'action'>;

  export type FormProps<RouteInferType> = {
    action:
      __next_route_internal_types__.RouteImpl<RouteInferType> | ((formData: FormData) => void);
  } & FormRestProps;

  export default function Form<RouteType>(props: FormProps<RouteType>): JSX.Element;
}
`
  );
}

/**
 * Союз адресов из файла, который написал сам Next (`.next/types/link.d.ts`).
 * Читается построчно, а не регулярным выражением на весь блок: блок длиной в
 * сотню строк, и разбор должен обрываться ровно там, где кончился союз.
 */
export function parseNextUnion(text, name) {
  const at = text.indexOf(`type ${name}`);
  if (at === -1) return null;
  const routes = [];
  for (const line of text.slice(at).split('\n').slice(1)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) break;
    routes.push(trimmed.replace(/^\|\s*/, '').replace(/^`|`;?$/g, ''));
  }
  return routes.sort();
}

/**
 * Сверка копии с тем, что при сборке написал Next.
 *
 * 🔴 Единственное место, где проверяется не «копия не отстала от `app/`», а
 * «правила обхода дерева повторены верно». Всё остальное сверяет копию с моим
 * же обходом — то есть само с собой, и общая ошибка в правилах прошла бы
 * молча. Свидетелем может быть только настоящая сборка, поэтому шаг стоит там,
 * где она уже произошла: в работе `check` после боевого образа.
 */
export function compareWithBuild(routes, generated) {
  const lines = [];
  for (const [name, mine] of [
    ['StaticRoutes', routes.statics],
    ['DynamicRoutes', routes.dynamics],
  ]) {
    const theirs = parseNextUnion(generated, name);
    if (theirs === null) {
      lines.push(`в файле сборки нет союза ${name} — формат Next изменился?`);
      continue;
    }
    const mineSet = new Set(mine);
    const theirsSet = new Set(theirs);
    for (const route of mine) if (!theirsSet.has(route)) lines.push(`${name}: лишний ${route}`);
    for (const route of theirs) if (!mineSet.has(route)) lines.push(`${name}: пропущен ${route}`);
  }
  return lines;
}

if (process.argv[1] !== undefined && process.argv[1].endsWith('routes-contract.mjs')) {
  const { values, positionals } = parseArgs({
    options: { write: { type: 'boolean' }, witness: { type: 'boolean' } },
    allowPositionals: true,
  });
  const routes = collectRoutes(APP_DIR);

  if (values.witness === true) {
    const path = positionals[0];
    if (path === undefined) {
      console.error('✗ нужен путь к link.d.ts из сборки: --witness <path>');
      process.exit(2);
    }
    const drift = compareWithBuild(routes, readFileSync(path, 'utf8'));
    if (drift.length > 0) {
      console.error('✗ копия контракта расходится со сборкой Next:');
      for (const line of drift) console.error(`    ${line}`);
      console.error('  Правила обхода дерева в scripts/routes-contract.mjs устарели.');
      process.exit(1);
    }
    console.log(
      `копия сошлась со сборкой: ${routes.statics.length} статических, ${routes.dynamics.length} динамических адресов`,
    );
  } else if (values.write === true) {
    writeFileSync(CONTRACT_PATH, renderContract(routes), 'utf8');
    console.log(`записано: ${CONTRACT_PATH}`);
  } else {
    process.stdout.write(renderContract(routes));
  }
}
