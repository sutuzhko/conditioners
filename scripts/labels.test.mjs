/**
 * Словарь ярлыков и синхронизация (issues #695, #696, #699).
 *
 * 🔴 Главные проверки здесь — против настоящего репозитория: путь раздела,
 * ведущий в несуществующий каталог, молча перестаёт ставить ярлык, а
 * переименованный `vr:accepted` молча ломает приём визуальных расхождений в
 * CI. Ни то ни другое не видно глазами в диффе словаря.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AXES, LABELS, checkAxes, labelsOf, pathMap } from './labels.mjs';
import { COMMENT_MARKER, auditIssues, findComment, renderComment } from './labels-audit.mjs';
import { LABELER_PATH, renderLabeler } from './labeler-generate.mjs';
import { planSync } from './labels-sync.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Кусок пути до первого шаблонного символа — по нему проверяется, что путь ведёт куда-то. */
const staticPrefix = (pattern) => {
  const cut = pattern.search(/[*?[]/);
  const head = cut === -1 ? pattern : pattern.slice(0, cut);
  return head.endsWith('/') ? head.slice(0, -1) : dirname(head + 'x');
};

describe('словарь', () => {
  it('у каждого ярлыка непустое описание и цвет', () => {
    for (const [name, label] of Object.entries(LABELS)) {
      expect(label.description, `${name}: пустое описание`).toBeTruthy();
      expect(label.color, `${name}: нет цвета`).toMatch(/^[0-9A-F]{6}$/i);
    }
  });

  it('ярлык оси несёт её префикс и её цвет', () => {
    for (const [axis, { prefix, color }] of Object.entries(AXES)) {
      const names = labelsOf(axis);
      expect(names.length, `ось «${axis}» пуста`).toBeGreaterThan(0);
      for (const name of names) {
        expect(name.startsWith(prefix), `${name} не начинается с ${prefix}`).toBe(true);
        expect(LABELS[name].color).toBe(color);
      }
    }
  });

  it('🔴 vr:accepted назван так же, как его читает CI', () => {
    const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
    expect('vr:accepted' in LABELS).toBe(true);
    expect(ci.includes("'vr:accepted'")).toBe(true);
  });

  it('🔴 каждый путь словаря ведёт в существующий каталог репозитория', () => {
    const broken = [];
    for (const [name, patterns] of Object.entries(pathMap())) {
      for (const pattern of patterns) {
        if (!existsSync(join(ROOT, staticPrefix(pattern)))) broken.push(`${name}: ${pattern}`);
      }
    }
    expect(broken, broken.join('\n')).toEqual([]);
  });

  it('у каждого раздела есть хотя бы один путь для labeler', () => {
    const withoutPaths = labelsOf('раздел').filter((name) => !(name in pathMap()));
    expect(withoutPaths, withoutPaths.join(', ')).toEqual([]);
  });
});

describe('проверка осей', () => {
  it('молчит на правильном наборе', () => {
    expect(checkAxes(['часть/панель', 'раздел/склад', 'тип/дефект'])).toEqual([]);
  });

  it('замечает отсутствие обязательной оси', () => {
    expect(checkAxes(['раздел/склад', 'тип/дефект']).join()).toContain('часть');
  });

  it('замечает две обязательные оси разом', () => {
    const problems = checkAxes(['часть/сайт', 'часть/панель', 'тип/дефект']);
    expect(problems.join()).toContain('2 раза');
  });

  it('замечает ярлык вне словаря — старая разметка не доживает молча', () => {
    const problems = checkAxes(['часть/панель', 'тип/дефект', 'ui']);
    expect(problems.join()).toContain('ui');
  });

  it('необязательные оси можно не ставить', () => {
    expect(checkAxes(['часть/документы', 'тип/решение'])).toEqual([]);
  });
});

describe('синхронизация', () => {
  const asExisting = (dictionary) =>
    Object.entries(dictionary).map(([name, label]) => ({
      name,
      color: label.color,
      description: label.description,
    }));

  it('🔴 повторный запуск ничего не меняет', () => {
    const plan = planSync(asExisting(LABELS), LABELS);
    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it('заводит отсутствующий ярлык', () => {
    const plan = planSync([], { 'тип/дефект': LABELS['тип/дефект'] });
    expect(plan.create.map((label) => label.name)).toEqual(['тип/дефект']);
  });

  it('правит разошедшийся цвет и описание, не трогая совпавшие', () => {
    const existing = asExisting(LABELS);
    existing[0] = { ...existing[0], color: '000000' };
    existing[1] = { ...existing[1], description: 'старое' };
    const plan = planSync(existing, LABELS);
    expect(plan.update.map((label) => label.name)).toEqual([existing[0].name, existing[1].name]);
  });

  it('не считает разошедшимся цвет в другом регистре и с решёткой', () => {
    const existing = asExisting(LABELS).map((label) => ({
      ...label,
      color: `#${label.color.toLowerCase()}`,
    }));
    expect(planSync(existing, LABELS).update).toEqual([]);
  });

  it('🔴 чужой ярлык попадает в удаление, но не в правку', () => {
    const plan = planSync([...asExisting(LABELS), { name: 'ui', color: '1D76DB' }], LABELS);
    expect(plan.remove).toEqual(['ui']);
    expect(plan.create).toEqual([]);
    expect(plan.update).toEqual([]);
  });
});

describe('ревизор разметки', () => {
  const issue = (number, names) => ({
    number,
    title: `задача ${number}`,
    labels: names.map((name) => ({ name })),
  });

  it('молчит, когда все задачи размечены', () => {
    expect(auditIssues([issue(1, ['часть/панель', 'тип/дефект'])])).toEqual([]);
  });

  it('🔴 называет задачу и причину, а не только число', () => {
    const [broken] = auditIssues([issue(42, ['тип/дефект'])]);
    expect(broken.number).toBe(42);
    expect(broken.problems.join()).toContain('часть');
  });

  it('ловит остатки старой разметки', () => {
    const [broken] = auditIssues([issue(7, ['часть/сайт', 'тип/дефект', 'ui'])]);
    expect(broken.problems.join()).toContain('ui');
  });
});

describe('карта для labeler', () => {
  it('🔴 файл в git совпадает с генерацией из словаря', () => {
    const expected = renderLabeler(pathMap());
    const actual = readFileSync(LABELER_PATH, 'utf8');
    expect(actual, 'файл устарел: node scripts/labeler-generate.mjs --write').toBe(expected);
  });

  it('каждый ярлык карты есть в словаре', () => {
    const text = readFileSync(LABELER_PATH, 'utf8');
    const names = [...text.matchAll(/^'([^']+)':$/gm)].map((match) => match[1]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !(name in LABELS))).toEqual([]);
  });
});

describe('заметка ревизора', () => {
  it('называет причину человеку, а не «оси нарушены»', () => {
    const text = renderComment(['нет ярлыка оси «часть»']);
    expect(text.startsWith(COMMENT_MARKER)).toBe(true);
    expect(text).toContain('нет ярлыка оси «часть»');
    expect(text).toContain('LABELS.md');
  });

  it('🔴 находит свою прежнюю заметку и не плодит новых', () => {
    const comments = [
      { id: 1, body: 'обычный комментарий' },
      { id: 2, body: renderComment(['нет ярлыка оси «тип»']) },
    ];
    expect(findComment(comments)?.id).toBe(2);
  });

  it('чужие комментарии своими не считает', () => {
    expect(findComment([{ id: 1, body: 'разметка неполная' }])).toBeUndefined();
  });
});
