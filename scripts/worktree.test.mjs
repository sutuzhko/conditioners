/**
 * Заведение и снос рабочего дерева: имена и поиск цели.
 *
 * 🔴 Ошибка в поиске цели стоит дороже всего остального в этом файле: `rm`
 * находит дерево по ветке или каталогу и после этого сносит его вместе с
 * томами. Промах означает снесённую чужую работу.
 */
import { describe, expect, it } from 'vitest';

import { StandError } from './stand.mjs';
import {
  DEFAULT_BASE,
  assertBranchName,
  findTree,
  removalRefusal,
  unpushedCount,
  worktreeDirName,
} from './worktree.mjs';

describe('базовая ветка', () => {
  it('по умолчанию release, а не main (ADR-376)', () => {
    expect(DEFAULT_BASE).toBe('release');
  });
});

describe('имя каталога из имени ветки', () => {
  it('раскладывает косую черту в дефис', () => {
    expect(worktreeDirName('fix/pager-scroll')).toBe('fix-pager-scroll');
    expect(worktreeDirName('feat/admin/calendar')).toBe('feat-admin-calendar');
  });

  it('различает ветки, отличающиеся только разделом', () => {
    expect(worktreeDirName('fix/pager')).not.toBe(worktreeDirName('feat/pager'));
  });
});

describe('проверка имени ветки', () => {
  it.each(['fix/pager-scroll', 'feat/admin-permissions', 'docs/deploy.section', 'ci/e2e_groups'])(
    'принимает %s',
    (name) => {
      expect(assertBranchName(name)).toBe(name);
    },
  );

  it.each([
    ['', 'пустое'],
    ['Fix/Pager', 'заглавные'],
    ['fix/pager scroll', 'пробел'],
    ['-fix/pager', 'дефис в начале'],
    ['fix/pager-', 'дефис в конце'],
    ['fix//pager', 'двойная черта'],
    ['fix/..pager', 'две точки'],
    ['fix/pager.lock', 'суффикс .lock'],
  ])('отказывает на «%s» (%s)', (name) => {
    expect(() => assertBranchName(name)).toThrow(StandError);
  });

  it('требует раздел: имя без него ничего не говорит о правке', () => {
    expect(() => assertBranchName('pager')).toThrow(/без раздела/);
  });
});

describe('поиск дерева для сноса', () => {
  const all = [
    { path: '/repo', branch: 'release', main: true },
    { path: '/repo/.claude/worktrees/fix-pager', branch: 'fix/pager-scroll', main: false },
    { path: '/repo/.claude/worktrees/feat-calendar', branch: 'feat/calendar', main: false },
  ];

  it('находит по имени ветки', () => {
    expect(findTree(all, 'fix/pager-scroll')?.path).toBe('/repo/.claude/worktrees/fix-pager');
  });

  it('находит по имени каталога', () => {
    expect(findTree(all, 'feat-calendar')?.branch).toBe('feat/calendar');
  });

  it('находит по полному пути', () => {
    expect(findTree(all, '/repo/.claude/worktrees/fix-pager')?.branch).toBe('fix/pager-scroll');
  });

  it('на неизвестном имени возвращает пустоту, а не первое попавшееся', () => {
    expect(findTree(all, 'fix/чего-нет')).toBeNull();
    expect(findTree(all, '')).toBeNull();
  });

  it('ветка важнее совпадения каталога: сносим то, что назвали', () => {
    const tricky = [
      { path: '/repo/.claude/worktrees/feat-calendar', branch: 'fix/other', main: false },
      { path: '/repo/.claude/worktrees/other', branch: 'feat/calendar', main: false },
    ];
    expect(findTree(tricky, 'feat/calendar')?.path).toBe('/repo/.claude/worktrees/other');
  });
});

describe('🔴 сносить или отказать', () => {
  const all = [
    { path: '/repo', branch: 'release', main: true },
    { path: '/repo/.claude/worktrees/fix-pager', branch: 'fix/pager-scroll', main: false },
  ];
  const tree = all[1];
  const clean = { tree, all, target: 'fix/pager-scroll', dirty: '', unpushed: 0 };

  it('чистое дерево с запушенной веткой сносится', () => {
    expect(removalRefusal(clean)).toBeNull();
  });

  it('дерева нет — отказ со списком заведённых', () => {
    const said = removalRefusal({ ...clean, tree: null, target: 'fix/чего-нет' });
    expect(said).toContain('fix/pager-scroll');
    expect(said).toContain('нет');
  });

  it('основное дерево не сносится даже с --force', () => {
    expect(removalRefusal({ ...clean, tree: all[0], force: true })).toContain('основное дерево');
  });

  it('несохранённые правки — отказ, и они названы', () => {
    const said = removalRefusal({ ...clean, dirty: ' M src/a.ts\n?? src/b.ts' });
    expect(said).toContain('src/a.ts');
    expect(said).toContain('--force');
  });

  it('коммиты, которых нет на origin, — отказ', () => {
    expect(removalRefusal({ ...clean, unpushed: 3 })).toContain('3 коммит');
  });

  it('🔴 непроверенная ветка — тоже отказ, а не «наверное, всё запушено»', () => {
    /* Защита, которая при собственной поломке отвечает «можно», защищает ровно
       до первой поломки — а платой будут коммиты, которых нет больше нигде. */
    expect(removalRefusal({ ...clean, unpushed: null })).toContain('не удалось проверить');
  });

  it('--force снимает оба отказа о потере работы', () => {
    expect(removalRefusal({ ...clean, dirty: ' M a', unpushed: null, force: true })).toBeNull();
  });

  it('дерево без ветки проверять на непушенное не нужно', () => {
    const detached = { path: '/repo/.claude/worktrees/x', branch: null, main: false };
    expect(removalRefusal({ ...clean, tree: detached, unpushed: null })).toBeNull();
  });
});

describe('счётчик непушенных коммитов', () => {
  it('читает число из вывода git', () => {
    expect(unpushedCount('0')).toBe(0);
    expect(unpushedCount('7')).toBe(7);
  });

  it('отказ git и мусор в выводе означают «не знаю», а не ноль', () => {
    expect(unpushedCount(null)).toBeNull();
    expect(unpushedCount('')).toBeNull();
    expect(unpushedCount('fatal: bad revision')).toBeNull();
  });
});
