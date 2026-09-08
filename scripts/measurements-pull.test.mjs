import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  checkRun,
  MEASUREMENTS_DIR,
  readManifest,
  syncDir,
  vouchedStories,
} from './measurements-pull.mjs';

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

/** Паспорт полного обхода: всё измерено, ничего не пропущено. */
function manifest(extra = {}) {
  return {
    version: 1,
    stories: 0,
    files: 0,
    measured: [],
    failed: [],
    skipped: [],
    coverage: { complete: true, shards: 4, pairs: 56, missing: [], why: '' },
    ...extra,
  };
}

describe('синхронизация каталога измерений', () => {
  it('обновляет изменённые, добавляет новые, удаляет названные ушедшими, считает совпавшие', () => {
    const src = tmp({ 'a.txt': 'A2', 'b.txt': 'B', 'new.txt': 'N' });
    const dest = tmp({ 'a.txt': 'A1', 'b.txt': 'B', 'gone.txt': 'G' });
    const result = syncDir(src, dest, new Set(['a.txt', 'b.txt', 'new.txt']));
    expect(result).toEqual({
      added: ['new.txt'],
      updated: ['a.txt'],
      removed: ['gone.txt'],
      kept: [],
      unchanged: 1,
    });
    expect(readdirSync(dest).sort()).toEqual(['a.txt', 'b.txt', 'new.txt']);
    expect(readFileSync(join(dest, 'a.txt'), 'utf8')).toBe('A2');
  });

  it('🔴 не удаляет историю, которую прогон видел, но не мерял', () => {
    const src = tmp({ 'a.txt': 'A2' });
    const dest = tmp({ 'a.txt': 'A1', 'пропущенная.txt': 'S', 'ушедшая.txt': 'G' });
    const result = syncDir(src, dest, new Set(['a.txt', 'пропущенная.txt']));
    expect(result.kept).toEqual(['пропущенная.txt']);
    expect(result.removed).toEqual(['ушедшая.txt']);
    expect(readdirSync(dest).sort()).toEqual(['a.txt', 'пропущенная.txt']);
  });

  it('🔴 без свидетельства прогона не удаляет ничего', () => {
    const src = tmp({ 'a.txt': 'A' });
    const dest = tmp({ 'a.txt': 'A', 'чужая.txt': 'X' });
    const result = syncDir(src, dest, null);
    expect(result.removed).toEqual([]);
    expect(result.kept).toEqual(['чужая.txt']);
    expect(readdirSync(dest).sort()).toEqual(['a.txt', 'чужая.txt']);
  });

  it('трогает только .txt — посторонние файлы каталога не удаляет', () => {
    const src = tmp({ 'a.txt': 'A', 'manifest.json': '{}' });
    const dest = tmp({ 'a.txt': 'A', 'README.md': 'не измерение' });
    syncDir(src, dest, new Set(['a.txt']));
    expect(readdirSync(dest).sort()).toEqual(['README.md', 'a.txt']);
  });

  it('каталог назначения — измерения приложения от корня репозитория', () => {
    expect(MEASUREMENTS_DIR.endsWith(join('apps', 'web', 'e2e', 'vr', 'measurements'))).toBe(true);
  });
});

describe('что артефакт разрешает удалить (issue #865)', () => {
  it('🔴 артефакт без паспорта не даёт удалять: молчание — не «истории нет»', () => {
    const verdict = vouchedStories(null, ['a.txt']);
    expect(verdict.known).toBeNull();
    expect(verdict.why).toContain('паспорт');
  });

  it('🔴 пропущенные по графу истории защищены от удаления', () => {
    const verdict = vouchedStories(
      manifest({ measured: ['кит-кнопка--базовое'], skipped: ['блоки-faq--базовое'] }),
      ['кит-кнопка--базовое.txt'],
    );
    expect(verdict.known).toEqual(new Set(['кит-кнопка--базовое.txt', 'блоки-faq--базовое.txt']));
  });

  it('🔴 отказавшая история защищена наравне с пропущенной', () => {
    const verdict = vouchedStories(
      manifest({ failed: [{ story: 'блоки-hero--базовое', reason: 'сценарий отказал' }] }),
      [],
    );
    expect(verdict.known).toEqual(new Set(['блоки-hero--базовое.txt']));
  });

  it('🔴 неполный обход отменяет удаления целиком', () => {
    const verdict = vouchedStories(
      manifest({
        coverage: {
          complete: false,
          shards: 4,
          pairs: 42,
          missing: ['panel 3/4 390/dark'],
          why: 'обход не закончен',
        },
      }),
      [],
    );
    expect(verdict.known).toBeNull();
    expect(verdict.why).toContain('обход не закончен');
  });

  it('🔴 обрезанная закачка не читается как «историй не мерили»', () => {
    const verdict = vouchedStories(manifest({ measured: ['а--б', 'в--г'] }), ['а--б.txt']);
    expect(verdict.known).toBeNull();
    expect(verdict.why).toContain('закачка неполная');
  });

  it('незнакомая версия паспорта — отказ от удалений, а не догадки', () => {
    const verdict = vouchedStories(manifest({ version: 99 }), []);
    expect(verdict.known).toBeNull();
    expect(verdict.why).toContain('99');
  });

  it('паспорт читается из каталога артефакта, а нечитаемый равен отсутствующему', () => {
    const good = tmp({ 'manifest.json': JSON.stringify(manifest()) });
    expect(readManifest(good)?.version).toBe(1);
    expect(readManifest(tmp({ 'manifest.json': 'не json' }))).toBeNull();
    expect(readManifest(tmp({}))).toBeNull();
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
