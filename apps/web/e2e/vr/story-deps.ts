import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * Какие истории задевает правка (issue #444, ADR-223).
 *
 * 🔴 Снимать все 3316 кадров на каждую правку — это минуты ожидания за
 * работу, которая касается одного компонента: правка одной строки в
 * `Button.module.css` пересчитывала истории каталога, статьи и подвала. Здесь
 * строится обратный граф: от изменённого файла к историям, которые до него
 * дотягиваются импортами.
 *
 * Граф считается по исходникам, а не по сборщику: витрина под снимки —
 * статика (ADR-231), и её граф модулей наружу не выведен. Разбор простой —
 * `import`/`export from`/`require` и `@import` в CSS, — и именно поэтому он
 * обязан ошибаться в безопасную сторону: всё, чего разбор не понял, считается
 * задевающим всё, и раннер снимает всё, как без графа.
 */

/** Корни, от которых считаются пути: репозиторий (изменённые файлы) и воркспейс `apps/web` (истории). */
export type Roots = {
  readonly repo: string;
  readonly web: string;
};

/**
 * По умолчанию корни берутся от расположения этого файла: `apps/web/e2e/vr`.
 * Считаются лениво — в тестах корни подставляются явно, и `__dirname` там не
 * нужен.
 */
function defaultRoots(): Roots {
  const web = resolve(__dirname, '../..');
  return { repo: resolve(web, '../..'), web };
}

/**
 * 🔴 Файлы, задевающие любую историю. Токены, глобальные стили, шрифты и
 * настройка витрины входят в кадр, не будучи импортированы историей: их
 * подключает `preview`, и граф импортов их не покажет. Пропустить их — значит
 * не переснять ничего после правки палитры. Сюда же — сам раннер, его
 * конфигурация, зависимости и образ: от них зависит, как снимается кадр.
 */
const AFFECTS_EVERYTHING = [
  'apps/web/src/shared/styles/',
  'apps/web/.storybook/',
  'apps/web/playwright.vr.config.ts',
  'apps/web/e2e/vr/',
  'apps/web/package.json',
  'pnpm-lock.yaml',
  'Dockerfile',
  '.github/workflows/ci.yml',
];

const EXTENSIONS = ['.ts', '.tsx', '.css', '.mjs', '.js', '.jsx', '.json'];

/** `import x from 'y'`, `export * from 'y'`, `require('y')`, `@import 'y'`. */
const SPECIFIER = /(?:from\s*|import\s*|require\(\s*|@import\s+(?:url\()?)['"]([^'"]+)['"]/g;

/** Разрешённый путь либо `null`, если это пакет; `unresolved`, если свой путь не нашёлся. */
type Resolved =
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'package' }
  | { readonly kind: 'unresolved' };

function resolveSpecifier(specifier: string, fromFile: string, src: string): Resolved {
  /* Пакеты не меняются от правки компонента: если поменялся `package.json`,
     сработает список «задевает всё». */
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return { kind: 'package' };

  const base = specifier.startsWith('@/')
    ? join(src, specifier.slice('@/'.length))
    : resolve(dirname(fromFile), specifier);

  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => join(base, 'index' + ext)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile())
      return { kind: 'file', path: candidate };
  }

  return { kind: 'unresolved' };
}

/**
 * Импорты файла — с памятью на время одного расчёта: один и тот же модуль
 * кита стоит в закрытии сотен историй, и читать его сотни раз незачем.
 */
class ImportIndex {
  private readonly cache = new Map<string, readonly string[]>();

  /** Свой импорт, который не разрешился: разбор чего-то не понял. */
  unresolved = false;

  constructor(private readonly src: string) {}

  importsOf(file: string): readonly string[] {
    const known = this.cache.get(file);
    if (known !== undefined) return known;

    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      this.cache.set(file, []);
      return [];
    }

    const imports: string[] = [];
    for (const match of source.matchAll(SPECIFIER)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      const resolved = resolveSpecifier(specifier, file, this.src);
      if (resolved.kind === 'file') imports.push(resolved.path);
      if (resolved.kind === 'unresolved') this.unresolved = true;
    }

    this.cache.set(file, imports);
    return imports;
  }
}

/** Все файлы, до которых дотягивается история. Обход в глубину с памятью. */
function reachableFrom(entry: string, index: ImportIndex): ReadonlySet<string> {
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    for (const imported of index.importsOf(file)) {
      if (!seen.has(imported)) queue.push(imported);
    }
  }

  return seen;
}

export type AffectedInput = {
  /** Пути изменённых файлов от корня репозитория. */
  readonly changed: readonly string[];
  /** Пути историй от корня воркспейса `apps/web`, как в `index.json` без `./`. */
  readonly storyPaths: readonly string[];
};

/**
 * Какие истории переснимать. `null` означает «все»: список изменённого пуст
 * (значит неизвестен), в нём есть файл, задевающий всё, история не нашлась на
 * диске или разбор не разрешил чей-то собственный импорт.
 */
export function affectedStoryPaths(
  { changed, storyPaths }: AffectedInput,
  roots: Roots = defaultRoots(),
): ReadonlySet<string> | null {
  if (changed.length === 0) return null;
  if (changed.some((file) => AFFECTS_EVERYTHING.some((prefix) => file.startsWith(prefix))))
    return null;

  /* Изменённые пути приходят от корня репозитория, граф считается от корня
     воркспейса — приводим к одному виду. */
  const changedAbsolute = new Set(changed.map((file) => resolve(roots.repo, file)));
  const index = new ImportIndex(join(roots.web, 'src'));

  const affected = new Set<string>();
  for (const storyPath of storyPaths) {
    const entry = resolve(roots.web, storyPath);
    if (!existsSync(entry) || !statSync(entry).isFile()) return null; // историю не нашли — снимаем всё

    for (const file of reachableFrom(entry, index)) {
      if (changedAbsolute.has(file)) {
        affected.add(storyPath);
        break;
      }
    }
  }

  return index.unresolved ? null : affected;
}

/** Список изменённых файлов из окружения (`VR_CHANGED`, по одному в строке). Пуст — значит неизвестен. */
export function changedFromEnv(): readonly string[] {
  const raw = process.env.VR_CHANGED;
  if (raw === undefined) return [];
  return raw.split(/\s+/).filter((line) => line.length > 0);
}

/** Путь истории от корня воркспейса: `index.json` отдаёт его с `./`. */
export function normaliseStoryPath(importPath: string): string {
  return relative('', importPath.replace(/^\.\//, ''));
}
