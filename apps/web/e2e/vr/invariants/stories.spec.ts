import { expect, test, type Page } from '@playwright/test';

import { VR_PANEL_WIDTHS, VR_THEMES, VR_WIDTHS } from '../../../playwright.vr.config';
import { firstLines } from '../outcome';
import { shardFromEnv, shardSlice } from '../shard';
import { FROZEN_NOW } from '../snapshot-run';
import { loadStories, pinnedWidths, type StoryEntry } from '../story-index';
import { waitForStoryReady, watchPlayFailures } from '../story-ready';
import { measureInvariants } from './measure';
import {
  describeViolations,
  emptyInvariantsTally,
  recordViolations,
  writeInvariantsOutcome,
  type InvariantsGroup,
} from './outcome';

/**
 * Инварианты без эталона на всех историях витрины (ADR-230, фаза 3 плана
 * снимков, issue #455).
 *
 * 🔴 Обходятся ВСЕ истории, включая `Админка/`. Пиксельная регрессия их не
 * снимает: разделы панели рисуются из данных, и кадр меняется вместе с базой
 * (ADR-207). Инвариантам данные безразличны — документ не переполнен, цель не
 * меньше порога, тема совпадает с запрошенной, текст не обрезан, поверх цели
 * никто не лежит, шрифты и картинки загрузились — верно для любой истории при
 * любых данных. Так 382 истории панели впервые получают машинную проверку.
 *
 * Эталона у инвариантов нет, поэтому нет ни кеша, ни базы, ни ярлыка
 * принятия: нарушение либо чинится, либо допускается параметром истории
 * `parameters.invariants.allow` с причиной — измеритель возвращает такое
 * нарушение с `allowed`, оно перечисляется в сводке, но не красит.
 *
 * Группы и ширины — как у снимков: публичные разделы на 320 / 375 / 768 /
 * 1200, панель и её разделы на 390 / 768 / 1440 (ADR-207). Сенсорной считается
 * раскладка уже 900px — там цель обязана быть 44×44, шире — 24×24 (ADR-183).
 * Доля списка — из `VR_SHARD`, как у снимков (`shard.ts`). Итог пары «ширина +
 * тема» уходит в `VR_OUTCOME_DIR`; вердикт по всем долям выносит сводная
 * работа пайплайна (`scripts/invariants-summary.mjs`).
 */

const GROUPS: readonly {
  readonly group: InvariantsGroup;
  readonly sections: readonly string[];
  readonly widths: readonly number[];
}[] = [
  { group: 'public', sections: ['Блоки/', 'Страницы/'], widths: VR_WIDTHS },
  { group: 'panel', sections: ['UI Kit/', 'Кит/', 'Админка/'], widths: VR_PANEL_WIDTHS },
];

/** Истории-фикстуры с нарочными нарушениями проверяет свой спек. */
const FIXTURES_SECTION = 'Фикстуры/';

/** Ниже этой ширины раскладка сенсорная, и цель обязана быть 44×44 (ADR-183). */
const TOUCH_BELOW = 900;

for (const { group, sections, widths } of GROUPS) {
  for (const width of widths) {
    for (const theme of VR_THEMES) {
      test(`инварианты ${group} на ${width}px, тема ${theme}`, async ({ page, request }) => {
        const stories = (await loadStories(request, sections)).filter(
          (story) => !story.title.startsWith(FIXTURES_SECTION),
        );
        expect(stories.length).toBeGreaterThan(0);

        await measureStories(page, { group, stories, width, widths, theme });
      });
    }
  }
}

type MeasureRun = {
  readonly group: InvariantsGroup;
  readonly stories: readonly StoryEntry[];
  readonly width: number;
  readonly widths: readonly number[];
  readonly theme: (typeof VR_THEMES)[number];
};

async function measureStories(page: Page, run: MeasureRun): Promise<void> {
  const shard = shardFromEnv();
  const stories = shard === null ? run.stories : shardSlice(run.stories, shard);
  const tally = emptyInvariantsTally();
  const touch = run.width < TOUCH_BELOW;

  /* Подготовка та же, что у снимков (`snapshot-run.ts`): подписка на отказы
     сценариев до первого перехода, область просмотра, покой для анимаций и
     замороженное «сейчас» — иначе история приходит к замеру в случайной точке
     своего оживания. */
  await watchPlayFailures(page);
  await page.setViewportSize({ width: run.width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(FROZEN_NOW);

  try {
    for (const story of stories) {
      if (!pinnedWidths(story, run.widths).includes(run.width)) continue;

      /* Отказ одной истории не обрывает обход: причина записывается, замер
         идёт дальше, а в конце список отказов красит тест целиком. */
      try {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${run.theme}`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForStoryReady(page);
        const violations = await page.evaluate(measureInvariants, { theme: run.theme, touch });
        recordViolations(tally, story.id, violations);
      } catch (error) {
        tally.failed.push({ story: story.id, reason: describeError(error) });
      }
    }
  } finally {
    /* Итог пишется и когда тест красный: сводной работе он нужен именно тогда. */
    const outcomeDir = process.env.VR_OUTCOME_DIR;
    if (outcomeDir !== undefined && outcomeDir.length > 0) {
      writeInvariantsOutcome(
        outcomeDir,
        {
          group: run.group,
          width: run.width,
          theme: run.theme,
          stories: tally.stories,
          violations: tally.violations,
          allowed: tally.allowed,
          failed: tally.failed,
        },
        shard ?? undefined,
      );
    }
  }

  expect(
    describeViolations(tally),
    'инварианты нарушены или истории не дошли до замера — список выше',
  ).toEqual([]);
}

function describeError(error: unknown): string {
  return firstLines(error instanceof Error ? error.message : String(error));
}
