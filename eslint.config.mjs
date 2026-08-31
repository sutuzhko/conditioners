import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * Правило зависимостей слоёв проверяется линтером, а не на словах:
 * app → widgets → features → entities → shared. Импорт «вверх» запрещён.
 * Это важно при параллельной работе нескольких агентов — см. docs/ORCHESTRATION.md
 *
 * 🔴 `@/server` входит в список запретов каждого слоя, а не задаётся отдельным
 * блоком на те же файлы. В плоском конфиге опции одноимённого правила
 * **заменяются**, а не сливаются: второй объект с `no-restricted-imports`
 * стирал все четыре `layerRule`, и правило слоёв полгода не проверялось ничем
 * (ревью кода 28 августа). У каждой группы файлов должна быть ровно одна
 * конфигурация этого правила — регресс держит `scripts/eslint-layers.test.ts`.
 */
const layerRule = (layer, forbidden) => ({
  files: [`apps/*/src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        // `*` не пересекает `/`, и одиночная звёздочка пропускала подпути
        // (`@/entities/product/model`) — так нарушения жили незамеченными
        // (аудит 23 августа). `**` закрывает и корень, и подпути.
        patterns: forbidden.map((f) => ({
          group: [`@/${f}`, `@/${f}/**`, `**/${f}/**`],
          message: `Слой ${layer} не может импортировать из ${f} — см. правило зависимостей в docs/CLAUDE.md`,
        })),
      },
    ],
  },
});

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    /* 🔴 Плагин Next ищет каталог приложения относительно места запуска. Из
       корня монорепозитория он его не находит, и правила, знающие про
       страницы, молча выключаются: `pnpm lint` был зелёным, а `next build`
       падал на том же коде через три минуты и в самом дорогом шаге. */
    settings: { next: { rootDir: join(dirname(fileURLToPath(import.meta.url)), 'apps/web') } },
  },
  {
    ignores: [
      '**/.next/**',
      'node_modules/**',
      '**/storybook-static/**',
      'coverage/**',
      'design/**',
      /* 🔴 Рабочие копии репозитория, которые заводит скилл `github-flow`.
         Линтеру там делать нечего: это тот же код, только в другой ветке, и
         обходит он его вместе с их `node_modules`. Две-три живые ветки — и
         `pnpm lint` даёт под пятьсот ошибок на чистом `main`, где CI зелёный
         (issue #417). Настоящая ошибка в таком выводе тонет. */
      '.claude/worktrees/**',
      // генерируется Next при каждой сборке, править его нельзя
      '**/next-env.d.ts',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // конфиги экспортируют объект по умолчанию — это их формат, а не небрежность
    files: ['*.config.mjs', '*.config.ts', '.storybook/**'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },
  {
    // скрипты сборки и сиды печатают отчёт в stdout — для них это интерфейс,
    // а не отладка: их запускают руками и читают вывод
    files: ['scripts/**', 'apps/web/scripts/**', 'apps/web/prisma/**'],
    rules: { 'no-console': 'off' },
  },
  {
    /**
     * Запреты TypeScript из docs/CLAUDE.md — машиной, а не на словах.
     *
     * 🔴 `as` не ловил никто, и это уже регрессировало: ADR-108 разбирал
     * одиннадцать накопившихся приведений руками, потому что искать их было
     * нечем. `assertionStyle: 'never'` запрещает и `x as T`, и `<T>x`;
     * `as const` рулём не считается и остаётся разрешённым.
     *
     * `ban-ts-comment` по умолчанию пропускает `@ts-expect-error` с описанием
     * — CLAUDE.md запрещает его без оговорок.
     */
    files: ['apps/*/src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
    },
  },
  {
    /**
     * Единственное узаконенное приведение типа (ADR-108): `Readable.toWeb`
     * отдаёт `ReadableStream` из `node:stream/web`, а `Response` ждёт
     * одноимённый тип из lib.dom — в рантайме это один объект, по структуре
     * типы расходятся. Читать файл в память нельзя: это фотографии объектов и
     * договоры клиентов. Обход без приведения существует только через `any`,
     * то есть хуже.
     *
     * Исключение точечное — по файлам отдачи, а не по каталогу: любое
     * приведение вне этого списка обязано снова упереться в правило. Список
     * вырос с двух до четырёх, когда снимки клиента уехали за сессию
     * (ADR-171): у закрытой отдачи ровно та же природа, что у открытой.
     */
    // квадратные скобки в шаблоне — это класс символов minimatch, а не имя
    // сегмента маршрута, поэтому динамические участки записаны звёздочкой
    files: [
      'apps/*/src/app/api/media/*/route.ts',
      'apps/*/src/app/api/admin/orders/*/docs/*/file/route.ts',
      'apps/*/src/app/api/admin/orders/*/photos/*/file/route.ts',
      'apps/*/src/app/api/admin/leads/*/photo/route.ts',
    ],
    rules: { '@typescript-eslint/consistent-type-assertions': 'off' },
  },
  {
    /* В тестах и историях `as` — приём сборки двойника: заглушка репозитория
       или фикстура намеренно неполна, и приведение здесь описывает замысел, а
       не прячет ошибку типизации. */
    files: [
      'apps/*/src/**/*.{test,spec}.{ts,tsx}',
      'apps/*/src/**/*.stories.{ts,tsx}',
      'apps/*/src/**/__mocks__/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
      /* Ссылка в фикстуре — не навигация приложения, а содержимое, которое
         подсовывают компоненту, чтобы проверить его поведение. */
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  layerRule('shared', ['app', 'widgets', 'features', 'entities', 'server']),
  layerRule('entities', ['app', 'widgets', 'features', 'server']),
  layerRule('features', ['app', 'widgets', 'server']),
  layerRule('widgets', ['app', 'server']),
  {
    // Единственное узаконенное исключение из правила слоёв (ADR-096):
    // сборщики разметки обязаны видеть доменные типы и константы — второй
    // источник правды о том, что такое товар и отзыв, разошёлся бы с
    // видимой страницей (инвариант 9). Всё остальное запрещено как прежде.
    files: ['apps/*/src/shared/seo/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['app', 'widgets', 'features', 'server'].map((f) => ({
            group: [`@/${f}`, `@/${f}/**`, `**/${f}/**`],
            message: `Слой shared не может импортировать из ${f} — исключение ADR-096 касается только entities`,
          })),
        },
      ],
    },
  },
];
