import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkRun, MEASUREMENTS_DIR, syncDir } from './measurements-pull.mjs';

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function tmp(files) {
  const dir = mkdtempSync(join(tmpdir(), 'measure-sync-'));
  dirs.push(dir);
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

describe('синхронизация каталога измерений', () => {
  it('обновляет изменённые, добавляет новые, удаляет пропавшие, считает совпавшие', () => {
    const src = tmp({ 'a.txt': 'A2', 'b.txt': 'B', 'new.txt': 'N' });
    const dest = tmp({ 'a.txt': 'A1', 'b.txt': 'B', 'gone.txt': 'G' });
    const result = syncDir(src, dest);
    expect(result).toEqual({
      added: ['new.txt'],
      updated: ['a.txt'],
      removed: ['gone.txt'],
      unchanged: 1,
    });
    expect(readdirSync(dest).sort()).toEqual(['a.txt', 'b.txt', 'new.txt']);
    expect(readFileSync(join(dest, 'a.txt'), 'utf8')).toBe('A2');
  });

  it('трогает только .txt — посторонние файлы каталога не удаляет', () => {
    const src = tmp({ 'a.txt': 'A' });
    const dest = tmp({ 'a.txt': 'A', 'README.md': 'не измерение' });
    syncDir(src, dest);
    expect(readdirSync(dest).sort()).toEqual(['README.md', 'a.txt']);
  });

  it('каталог назначения — измерения приложения от корня репозитория', () => {
    expect(MEASUREMENTS_DIR.endsWith(join('apps', 'web', 'e2e', 'vr', 'measurements'))).toBe(true);
  });
});

describe('годность артефакта рабочему дереву (issue #643)', () => {
  const run = (extra) => ({
    databaseId: 42,
    headBranch: 'feat/ветка',
    headSha: 'a'.repeat(40),
    ...extra,
  });

  it('пропускает прогон, снятый на том же коммите той же ветки', () => {
    expect(
      checkRun({
        run: run(),
        headSha: 'a'.repeat(40),
        branch: 'feat/ветка',
        ancestor: true,
      }),
    ).toEqual({ ok: true });
  });

  it('🔴 отказывает, когда после снятия артефакта в ветку влит main', () => {
    const verdict = checkRun({
      run: run(),
      headSha: 'b'.repeat(40),
      branch: 'feat/ветка',
      ancestor: true,
    });
    expect(verdict.ok).toBe(false);
    /* Ровно тот случай, ради которого правило заведено: слепок снят до
       слияния и вернул бы чужие измерения в дослияночный вид. */
    expect(verdict.reason).toContain('предок HEAD');
    expect(verdict.reason).toContain('aaaaaaaa');
    expect(verdict.reason).toContain('bbbbbbbb');
    expect(verdict.reason).toContain('--force');
  });

  it('отказывает, когда коммит прогона вообще не связан с HEAD', () => {
    const verdict = checkRun({
      run: run(),
      headSha: 'b'.repeat(40),
      branch: 'feat/ветка',
      ancestor: false,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('другое дерево');
  });

  it('отказывает на прогоне чужой ветки, даже если коммит совпал бы', () => {
    const verdict = checkRun({
      run: run({ headBranch: 'feat/чужая' }),
      headSha: 'a'.repeat(40),
      branch: 'feat/ветка',
      ancestor: true,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('feat/чужая');
  });

  it('отказывает, когда прогон не сообщает коммит', () => {
    const verdict = checkRun({
      run: run({ headSha: '' }),
      headSha: 'a'.repeat(40),
      branch: 'feat/ветка',
      ancestor: false,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain('headSha');
  });

  it('отсоединённый HEAD не мешает: ветка не сверяется, коммит сверяется', () => {
    expect(checkRun({ run: run(), headSha: 'a'.repeat(40), branch: '', ancestor: true })).toEqual({
      ok: true,
    });
    expect(checkRun({ run: run(), headSha: 'c'.repeat(40), branch: '', ancestor: true }).ok).toBe(
      false,
    );
  });
});
