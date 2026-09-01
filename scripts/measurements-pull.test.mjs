import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { MEASUREMENTS_DIR, syncDir } from './measurements-pull.mjs';

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
