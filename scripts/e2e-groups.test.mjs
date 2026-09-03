/**
 * Состав групп сквозных сценариев (issue #499).
 *
 * 🔴 Главная проверка здесь — против настоящего каталога `apps/web/e2e/`:
 * spec-файл, не приписанный ни к одной группе, не попадает ни в один шард и
 * молча выпадает из CI. Этот тест красит `check`, а та же проверка в сводной
 * работе красит `e2e` — файл не может потеряться незамеченным.
 */
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { E2E_DIR, GROUPS, checkCoverage, listSpecs, specsOf } from './e2e-groups.mjs';

const groups = {
  site: ['smoke'],
  panel: ['admin-shell', 'admin-layout'],
};

describe('состав групп', () => {
  it('🔴 каждый spec-файл настоящего каталога лежит ровно в одной группе', () => {
    const result = checkCoverage(GROUPS, listSpecs(E2E_DIR));
    expect(result.problems, result.problems.join('\n')).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('группы не пусты и не пересекаются между собой', () => {
    const all = Object.values(GROUPS).flat();
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all).size).toBe(all.length);
    for (const files of Object.values(GROUPS)) expect(files.length).toBeGreaterThan(0);
  });
});

describe('файлы группы для раннера', () => {
  it('отдаёт пути spec-файлов относительно apps/web — так их ждёт Playwright', () => {
    expect(specsOf(groups, 'panel')).toEqual([
      'e2e/admin-shell.spec.ts',
      'e2e/admin-layout.spec.ts',
    ]);
  });

  it('🔴 неизвестная группа — громкая ошибка, а не пустой список: пустой список прогнал бы всё', () => {
    expect(() => specsOf(groups, 'нет-такой')).toThrow(/группы «нет-такой» нет/);
  });
});

describe('покрытие каталога', () => {
  it('файл вне групп красит и назван по имени', () => {
    const result = checkCoverage(groups, ['smoke', 'admin-shell', 'admin-layout', 'lead']);
    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toMatch(/lead\.spec\.ts.*ни в одной группе/);
  });

  it('файл в двух группах красит', () => {
    const twice = { site: ['smoke'], panel: ['smoke', 'admin-shell'] };
    const result = checkCoverage(twice, ['smoke', 'admin-shell']);
    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toMatch(/smoke\.spec\.ts.*дважды: site, panel/);
  });

  it('запись о файле, которого нет на диске, красит: список обязан быть честным', () => {
    const result = checkCoverage(groups, ['smoke', 'admin-shell']);
    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toMatch(/admin-layout\.spec\.ts.*нет на диске.*panel/);
  });

  it('полное покрытие без лишнего — чисто', () => {
    const result = checkCoverage(groups, ['smoke', 'admin-shell', 'admin-layout']);
    expect(result).toEqual({ ok: true, problems: [] });
  });
});

describe('список spec-файлов каталога', () => {
  it('берёт только *.spec.ts верхнего уровня: vr/ и support/ — не сценарии', () => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-specs-'));
    writeFileSync(join(dir, 'lead.spec.ts'), '');
    writeFileSync(join(dir, 'smoke.spec.ts'), '');
    writeFileSync(join(dir, 'helper.ts'), '');
    mkdirSync(join(dir, 'vr'));
    writeFileSync(join(dir, 'vr', 'stories.spec.ts'), '');
    mkdirSync(join(dir, 'support'));
    writeFileSync(join(dir, 'support', 'admin-api.ts'), '');
    expect(listSpecs(dir)).toEqual(['lead', 'smoke']);
  });
});
