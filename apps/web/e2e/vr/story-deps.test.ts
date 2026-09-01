import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { affectedStoryPaths, normaliseStoryPath, type Roots } from './story-deps';

/**
 * Граф импортов на временном дереве файлов — как настоящее `apps/web/src`,
 * только маленькое: кнопка, карточка, три файла историй.
 */
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function repo(): Roots {
  const root = mkdtempSync(join(tmpdir(), 'vr-deps-'));
  dirs.push(root);
  const web = join(root, 'apps', 'web');
  const files: Record<string, string> = {
    'src/shared/ui/Button/Button.module.css': '.root { color: red; }',
    'src/shared/ui/Button/Button.tsx':
      "import styles from './Button.module.css';\nexport const Button = () => styles.root;",
    'src/shared/ui/Card/Card.module.css':
      "@import '../Button/Button.module.css';\n.card { padding: 1px; }",
    'src/shared/ui/Card/Card.tsx':
      "import styles from './Card.module.css';\nexport const Card = () => styles.card;",
    'src/widgets/pricing/Pricing.stories.tsx':
      "import { Button } from '@/shared/ui/Button/Button';\nexport default { component: Button };",
    'src/widgets/catalog/Catalog.stories.tsx':
      "import { Card } from '../../shared/ui/Card/Card';\nexport default { component: Card };",
    'src/widgets/footer/Footer.stories.tsx':
      "import React from 'react';\nexport default { title: 'Подвал' };",
    'src/widgets/broken/Broken.stories.tsx':
      "import { Nope } from './missing-module';\nexport default { component: Nope };",
  };
  for (const [path, source] of Object.entries(files)) {
    const full = join(web, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, source);
  }
  return { repo: root, web };
}

const STORIES = [
  'src/widgets/pricing/Pricing.stories.tsx',
  'src/widgets/catalog/Catalog.stories.tsx',
  'src/widgets/footer/Footer.stories.tsx',
];

describe('affectedStoryPaths', () => {
  it('правка модуля кнопки задевает истории напрямую и через @import в CSS, но не подвал', () => {
    const affected = affectedStoryPaths(
      { changed: ['apps/web/src/shared/ui/Button/Button.module.css'], storyPaths: STORIES },
      repo(),
    );
    expect(affected).not.toBeNull();
    expect([...(affected ?? [])].sort()).toEqual([
      'src/widgets/catalog/Catalog.stories.tsx',
      'src/widgets/pricing/Pricing.stories.tsx',
    ]);
  });

  it('правка токенов задевает всё — null', () => {
    expect(
      affectedStoryPaths(
        { changed: ['apps/web/src/shared/styles/tokens.css'], storyPaths: STORIES },
        repo(),
      ),
    ).toBeNull();
  });

  it('пустой список изменённого — неизвестность, снимается всё', () => {
    expect(affectedStoryPaths({ changed: [], storyPaths: STORIES }, repo())).toBeNull();
  });

  it('🔴 неразрешённый собственный импорт — разбор не понял, снимается всё', () => {
    expect(
      affectedStoryPaths(
        {
          changed: ['apps/web/src/shared/ui/Button/Button.module.css'],
          storyPaths: [...STORIES, 'src/widgets/broken/Broken.stories.tsx'],
        },
        repo(),
      ),
    ).toBeNull();
  });

  it('история, которой нет на диске, — снимается всё', () => {
    expect(
      affectedStoryPaths(
        {
          changed: ['apps/web/src/shared/ui/Button/Button.module.css'],
          storyPaths: ['src/widgets/ghost/Ghost.stories.tsx'],
        },
        repo(),
      ),
    ).toBeNull();
  });

  it('правка файла, до которого никто не дотягивается, не задевает ни одной истории', () => {
    const affected = affectedStoryPaths(
      { changed: ['apps/web/src/server/db.ts'], storyPaths: STORIES },
      repo(),
    );
    expect(affected).toEqual(new Set());
  });
});

describe('normaliseStoryPath', () => {
  it('снимает ./ из пути индекса витрины', () => {
    expect(normaliseStoryPath('./src/widgets/hero/Hero.stories.tsx')).toBe(
      'src/widgets/hero/Hero.stories.tsx',
    );
  });
});
