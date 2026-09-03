import { expect, test, type Page } from '@playwright/test';

import { COVERED_SECTIONS, sectionOf } from '../sections';
import { loadStories } from '../story-index';
import { waitForStoryReady, watchPlayFailures } from '../story-ready';
import { type InvariantRule, type MeasureInput, measureInvariants } from './measure';
import { checkStability, readStabilityParameters } from './stability';

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

/**
 * 🔴 Сторож покрытия (issue #517). Работы обходят разделы по списку, и раздел,
 * которого в списке нет, не проверяется ничем — молча: прогон зелёный, потому
 * что проверять было нечего. Так из всех работ выпали `Фичи/` (формы заявки и
 * отзыва) и `Календарь/`, и заметили это только при сдаче чужой вехи.
 *
 * Проверяется не «зелено ли», а «попало ли в список»: любое название истории,
 * чей раздел не назван в `sections.ts`, красит прогон.
 */
test('🔴 у каждого раздела витрины есть работа, которая его проверяет', async ({ request }) => {
  const all = await loadStories(request, ['']);
  expect(all.length, 'витрина не отдала ни одной истории').toBeGreaterThan(0);

  const orphans = [...new Set(all.map((story) => sectionOf(story.title)))]
    .filter((section) => !COVERED_SECTIONS.includes(section))
    .sort();

  expect(
    orphans,
    'раздел витрины не входит ни в одну работу — допишите его в e2e/vr/sections.ts',
  ).toEqual([]);
});

const SECTION = 'Фикстуры/Инварианты';
const WIDTH = 768;

const RULES: readonly InvariantRule[] = [
  'overflow-x',
  'target-size',
  'target-size-touch',
  'theme',
  'clipped-text',
  'occlusion',
  'fonts',
  'images',
  'stability',
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

async function open(page: Page, storyId: string, theme: string): Promise<void> {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:${theme}`, {
    waitUntil: 'domcontentloaded',
  });
  await waitForStoryReady(page);
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
    await open(page, story.id, theme);

    const expected = [...(await expectedRules(page))].sort();
    /* Тип входа назван явно: в литерале объекта `theme` расширился бы до
       `string`, и сигнатура измерителя его не приняла бы. */
    const input: MeasureInput = { theme, touch: WIDTH < 900 };
    const measured = await page.evaluate(measureInvariants, input);
    /* Устойчивость меряет не измеритель, а обход состояний (stability.ts) —
       фикстура опорной истории доказывает и его. */
    const stability = await checkStability(page, await readStabilityParameters(page), (id) =>
      open(page, id, theme),
    );
    const found = [...measured, ...stability.violations];
    for (const failure of stability.failures) mismatches.push(`${story.id}: ${failure}`);
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
