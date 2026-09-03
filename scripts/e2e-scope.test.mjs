/**
 * Перечень путей, влияющих на сквозные сценарии (issue #503).
 *
 * 🔴 Один перечень отвечает на два вопроса: задевает ли правка PR исход
 * сценариев (шлюз) и каков ключ содержимого проверяемого дерева (кеш
 * зелёного прогона). Ошибка в перечне в одну сторону гоняет сценарии зря, в
 * другую — молча пропускает поломку; поэтому каждая граница проверяется
 * отдельно, а ключ доказанно не зависит от нерелевантных путей.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { affects, contentKey, relevant } from './e2e-scope.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('что задевает сценарии', () => {
  it.each([
    'apps/web/src/app/(site)/page.tsx',
    'apps/web/src/server/repo/leads.ts',
    'apps/web/src/shared/styles/tokens.css',
    'apps/web/prisma/schema.prisma',
    'apps/web/prisma/seed-demo.ts',
    'apps/web/e2e/lead.spec.ts',
    'apps/web/e2e/support/admin-api.ts',
    'apps/web/public/robots.txt',
    'apps/web/playwright.config.ts',
    'apps/web/next.config.ts',
    'apps/web/tsconfig.json',
    'apps/web/package.json',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.npmrc',
    'tsconfig.base.json',
    'Dockerfile',
    '.dockerignore',
    '.github/workflows/ci.yml',
    'scripts/e2e-groups.mjs',
    'scripts/e2e-summary.mjs',
    'scripts/e2e-scope.mjs',
  ])('задевает: %s', (path) => {
    expect(affects(path)).toBe(true);
  });

  it.each([
    'docs/DECISIONS.md',
    'docs/plan-e2e-ci-parallel.md',
    'CLAUDE.md',
    'README.md',
    '.github/workflows/deploy.yml',
    'docker-compose.prod.yml',
    'Caddyfile',
    'infra/deploy.sh',
    'apps/web/src/shared/ui/Button/Button.stories.tsx',
    'apps/web/src/entities/price/model.test.ts',
    'apps/web/src/widgets/hero/Hero.test.tsx',
    'apps/web/src/app/error.spec.tsx',
    'apps/web/.storybook/main.ts',
    'apps/web/e2e/vr/stories.spec.ts',
    'apps/web/e2e/vr/measurements/блоки-цены--basic.txt',
    'apps/web/playwright.vr.config.ts',
    'apps/web/vitest.config.ts',
    'apps/web/scripts/shot.ts',
    'scripts/e2e-groups.test.mjs',
    'scripts/e2e-stand.mjs',
    'scripts/vr-summary.mjs',
    'eslint.config.mjs',
    '.claude/skills/prd/SKILL.md',
  ])('не задевает: %s', (path) => {
    expect(affects(path)).toBe(false);
  });

  it('из списка PR остаются только задевающие пути, в исходном порядке', () => {
    expect(
      relevant(['docs/ROADMAP.md', 'apps/web/src/app/page.tsx', '', 'Dockerfile', 'README.md']),
    ).toEqual(['apps/web/src/app/page.tsx', 'Dockerfile']);
  });
});

/** Строка `git ls-tree -r`: режим, тип, blob и путь через табуляцию. */
const line = (sha, path) => `100644 blob ${sha}\t${path}`;

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

describe('ключ содержимого', () => {
  const tree = [
    line(A, 'apps/web/src/app/page.tsx'),
    line(A, 'docs/DECISIONS.md'),
    line(A, 'apps/web/e2e/vr/measurements/блоки цены--basic.txt'),
    line(A, 'Dockerfile'),
  ];

  it('шестнадцатеричный SHA-256 и один и тот же для одного дерева', () => {
    const key = contentKey(tree);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(contentKey([...tree])).toBe(key);
  });

  it('🔴 не меняется от правки документации, измерений и порядка строк', () => {
    const key = contentKey(tree);
    const docsChanged = tree.map((row) =>
      row.endsWith('docs/DECISIONS.md') || row.includes('measurements') ? row.replace(A, B) : row,
    );
    expect(contentKey(docsChanged)).toBe(key);
    expect(contentKey([...tree].reverse())).toBe(key);
  });

  it('🔴 меняется от правки исходника и от правки образа', () => {
    const key = contentKey(tree);
    const srcChanged = tree.map((row) => (row.endsWith('page.tsx') ? row.replace(A, B) : row));
    const imageChanged = tree.map((row) => (row.endsWith('Dockerfile') ? row.replace(A, B) : row));
    expect(contentKey(srcChanged)).not.toBe(key);
    expect(contentKey(imageChanged)).not.toBe(key);
    expect(contentKey(srcChanged)).not.toBe(contentKey(imageChanged));
  });

  it('меняется от добавления и удаления задевающего файла', () => {
    const key = contentKey(tree);
    expect(contentKey([...tree, line(A, 'apps/web/e2e/new.spec.ts')])).not.toBe(key);
    expect(contentKey(tree.filter((row) => !row.endsWith('Dockerfile')))).not.toBe(key);
  });

  it('меняется от смены режима файла: исполняемость сида — тоже содержимое', () => {
    const key = contentKey(tree);
    const modeChanged = tree.map((row) =>
      row.endsWith('Dockerfile') ? row.replace('100644', '100755') : row,
    );
    expect(contentKey(modeChanged)).not.toBe(key);
  });
});

describe('командная строка', () => {
  const cli = (args, input = '') =>
    execFileSync('node', ['scripts/e2e-scope.mjs', ...args], {
      cwd: ROOT,
      input,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

  it('--changed: документация — false, исходник — true', () => {
    expect(cli(['--changed'], 'docs/ROADMAP.md\ndocs/HANDOFF.md\n')).toBe('false');
    expect(cli(['--changed'], 'docs/ROADMAP.md\napps/web/src/app/page.tsx\n')).toBe('true');
    expect(cli(['--changed'], '')).toBe('false');
  });

  it('--key: ключ настоящего дерева репозитория — 64 шестнадцатеричных знака', () => {
    expect(cli(['--key'])).toMatch(/^[0-9a-f]{64}$/);
  });
});
