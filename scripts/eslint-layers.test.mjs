/**
 * Регресс на правило зависимостей слоёв.
 *
 * 🔴 Дефект, ради которого написан тест, в диффе не виден вовсе. В плоском
 * конфиге ESLint опции одноимённого правила у совпадающих блоков
 * **заменяются**, а не сливаются: отдельный объект с `no-restricted-imports`
 * на `apps/*∕src/{shared,entities,features,widgets}/**` стирал все четыре
 * `layerRule` и оставлял живым один запрет на `@/server`. Конфиг при этом
 * читается как рабочий, `pnpm lint` зелёный, а правило слоёв — на которое
 * опираются CLAUDE.md и ORCHESTRATION.md при параллельной работе агентов — не
 * проверяется ничем.
 *
 * Поэтому проверяется не текст конфига, а его результат: итоговый список
 * запретов для файла каждого слоя.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Правило зависимостей из docs/CLAUDE.md: `app → widgets → features →
 * entities → shared`, плюс серверный слой, закрытый от всех клиентских.
 *
 * `shared/seo` — единственное узаконенное исключение (ADR-096): сборщики
 * разметки видят доменные типы, всё остальное запрещено как прежде.
 */
const layers = [
  {
    name: 'shared',
    file: 'apps/web/src/shared/lib/format.ts',
    forbidden: ['@/app', '@/widgets', '@/features', '@/entities', '@/server'],
  },
  {
    name: 'entities',
    file: 'apps/web/src/entities/product/model.ts',
    forbidden: ['@/app', '@/widgets', '@/features', '@/server'],
  },
  {
    name: 'features',
    file: 'apps/web/src/features/lead-form/lib.ts',
    forbidden: ['@/app', '@/widgets', '@/server'],
  },
  {
    name: 'widgets',
    file: 'apps/web/src/widgets/hero/Hero.tsx',
    forbidden: ['@/app', '@/server'],
  },
  {
    name: 'shared/seo (исключение ADR-096)',
    file: 'apps/web/src/shared/seo/business.ts',
    forbidden: ['@/app', '@/widgets', '@/features', '@/server'],
  },
];

const eslint = new ESLint({ cwd: root });

/** Что на самом деле запрещено файлу — так же, как это печатает `--print-config`. */
async function forbiddenFor(file) {
  const config = await eslint.calculateConfigForFile(resolve(root, file));
  const rule = config.rules?.['no-restricted-imports'];

  if (rule === undefined) return null;

  const [, options] = rule;
  return options.patterns.map((pattern) => pattern.group[0]);
}

/**
 * 🔴 Первый разбор конфига тянет весь плоский конфиг вместе с пресетами Next
 * и занимает десятки секунд; дальше ESLint отвечает из кеша. Прогрев вынесен
 * отдельно и с честным запасом по времени — иначе цена загрузки падала на
 * первый же случай и он падал по таймауту, хотя проверял верное.
 */
describe('правило зависимостей слоёв в eslint.config.mjs', () => {
  beforeAll(async () => {
    await forbiddenFor('apps/web/src/shared/lib/format.ts');
  }, 120_000);

  it.each(layers)('слой $name закрыт от $forbidden', async ({ file, forbidden }) => {
    expect(await forbiddenFor(file)).toEqual(forbidden);
  });

  /* Подпути закрываются вторым и третьим шаблоном группы: одиночная `*` не
     пересекает `/`, и `@/entities/product/model` жил незамеченным (аудит
     23 августа). */
  it('каждый запрет закрывает и корень, и подпути', async () => {
    const config = await eslint.calculateConfigForFile(
      resolve(root, 'apps/web/src/widgets/hero/Hero.tsx'),
    );
    const [, options] = config.rules['no-restricted-imports'];

    for (const pattern of options.patterns) {
      expect(pattern.group).toContain(`${pattern.group[0]}/**`);
    }
  });
});
