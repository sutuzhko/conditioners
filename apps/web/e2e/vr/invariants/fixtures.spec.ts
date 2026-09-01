import { expect, test, type Page } from '@playwright/test';

import { loadStories } from '../story-index';
import { waitForStoryReady, watchPlayFailures } from '../story-ready';
import { measureInvariants, type InvariantRule } from './measure';

/**
 * Фикстуры измерителя инвариантов — каждое правило доказывает, что падает
 * (issue #456, ADR-230).
 *
 * 🔴 Истории раздела `Фикстуры/Инварианты` нарочно нарушают по одному правилу
 * и объявляют его в `parameters.invariants.expect`. Здесь требуется, чтобы
 * множество недопущенных нарушений совпало с ожиданием РОВНО: меньше —
 * правило перестало ловить свою фикстуру, больше — ловит лишнее и будет
 * красить честные истории. Красный здесь — про измеритель, не про витрину.
 *
 * Одна ширина и тема на историю: правила от ширины не зависят, кроме порога
 * цели, а фикстура цели нарушает оба порога. Тёмную тему просит тег
 * `theme-dark` — так фикстура темы получает `data-theme="dark"` от витрины
 * и красит фон вопреки ему.
 */

const SECTION = 'Фикстуры/Инварианты';
const WIDTH = 768;

const RULES: readonly InvariantRule[] = [
  'overflow-x',
  'target-size',
  'theme',
  'clipped-text',
  'occlusion',
  'fonts',
  'images',
];

/** Ожидание истории из её параметров — читается в странице, в `index.json` параметров нет. */
async function expectedRules(page: Page): Promise<readonly InvariantRule[]> {
  const raw = await page.evaluate(() => {
    const parameters = window.__STORYBOOK_PREVIEW__?.currentRender?.story?.parameters;
    const invariants = parameters?.invariants;
    if (typeof invariants !== 'object' || invariants === null) return null;
    const list = Reflect.get(invariants, 'expect');
    return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : null;
  });
  expect(raw, 'у фикстуры нет parameters.invariants.expect — это не фикстура').not.toBeNull();
  return (raw ?? []).filter((item): item is InvariantRule => RULES.some((rule) => rule === item));
}

test('каждая фикстура даёт ровно свои нарушения', async ({ page, request }) => {
  const stories = await loadStories(request, [SECTION]);
  expect(stories.length, 'раздел фикстур пуст — их не собрала витрина').toBeGreaterThan(0);

  await watchPlayFailures(page);
  await page.setViewportSize({ width: WIDTH, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const mismatches: string[] = [];

  for (const story of stories) {
    const theme = story.tags?.includes('theme-dark') ? 'dark' : 'light';
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForStoryReady(page);

    const expected = [...(await expectedRules(page))].sort();
    const found = await page.evaluate(measureInvariants, { theme, touch: WIDTH < 900 });
    const actual = [
      ...new Set(found.filter((item) => item.allowed === null).map((item) => item.rule)),
    ].sort();

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      const details = found
        .map((item) => `${item.rule}: ${item.element} — ${item.detail}`)
        .join('; ');
      mismatches.push(
        `${story.id}: ожидалось [${expected.join(', ')}], найдено [${actual.join(', ')}] (${details || 'пусто'})`,
      );
    }
  }

  expect(mismatches, 'измеритель разошёлся с фикстурами').toEqual([]);
});
