import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * Правило зависимостей слоёв проверяется линтером, а не на словах:
 * app → widgets → features → entities → shared. Импорт «вверх» запрещён.
 * Это важно при параллельной работе нескольких агентов — см. docs/ORCHESTRATION.md
 */
const layerRule = (layer, forbidden) => ({
  files: [`apps/*/src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: forbidden.map((f) => ({
          group: [`@/${f}/*`, `**/${f}/*`],
          message: `Слой ${layer} не может импортировать из ${f} — см. правило зависимостей в docs/CLAUDE.md`,
        })),
      },
    ],
  },
});

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    ignores: [
      '**/.next/**',
      'node_modules/**',
      '**/storybook-static/**',
      'coverage/**',
      'design/**',
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
    // скрипты сборки печатают отчёт в stdout — для них это интерфейс, а не отладка
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  layerRule('shared', ['app', 'widgets', 'features', 'entities', 'server']),
  layerRule('entities', ['app', 'widgets', 'features']),
  layerRule('features', ['app', 'widgets']),
  layerRule('widgets', ['app']),
  {
    // серверный код не должен утекать в клиентские слои — секреты живут только тут
    files: ['apps/*/src/{shared,entities,features,widgets}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/server/*'], message: 'Доступ к серверному слою — только из app/ и route handlers' }] },
      ],
    },
  },
];
