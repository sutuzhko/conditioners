/**
 * Заведение и снос рабочего дерева: имена и поиск цели.
 *
 * 🔴 Ошибка в поиске цели стоит дороже всего остального в этом файле: `rm`
 * находит дерево по ветке или каталогу и после этого сносит его вместе с
 * томами. Промах означает снесённую чужую работу.
 */
import { describe, expect, it } from 'vitest';

import { StandError } from './stand.mjs';
import { DEFAULT_BASE, assertBranchName, findTree, worktreeDirName } from './worktree.mjs';

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
