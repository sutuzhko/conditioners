import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { VR_PANEL_WIDTHS, VR_THEMES, VR_WIDTHS } from '../../../playwright.vr.config';
import { firstLines } from '../outcome';
import { FIXTURES_SECTION, PANEL_SECTIONS, PUBLIC_SECTIONS } from '../sections';
import { shardFromEnv, shardSlice, type Shard } from '../shard';
import { FROZEN_NOW } from '../snapshot-run';
import { affectedStoryPaths, changedFromEnv, normaliseStoryPath } from '../story-deps';
import { loadStories, pinnedWidths, type StoryEntry } from '../story-index';
import { waitForStoryReady, watchPlayFailures } from '../story-ready';
import { collectMeasurements } from './collect';

/**
 * Измерения раскладки всех историй витрины (ADR-230, фаза 4 плана снимков,
 * issue #460). Обход тот же, что у инвариантов: публичные разделы на своих
 * ширинах, панель и `Админка/` — на своих, обе темы, доля из `VR_SHARD`.
 *
 * 🔴 Спек не сравнивает ничего сам — он пишет по файлу на пару «история +
 * ширина + тема» (ровно `PartialMeasurement`). Файл истории собирает из
 * частей и сравнивает с репозиторием Node-сторона: у одной истории части
 * приходят из шести-восьми тестов, а с шардами — ещё и из разных работ.
 */

type Group = 'public' | 'panel';

const GROUPS: readonly {
  readonly group: Group;
  readonly sections: readonly string[];
  readonly widths: readonly number[];
}[] = [
  { group: 'public', sections: PUBLIC_SECTIONS, widths: VR_WIDTHS },
  { group: 'panel', sections: PANEL_SECTIONS, widths: VR_PANEL_WIDTHS },
];

/** Без `VR_OUTCOME_DIR` части ложатся рядом со спеками — каталог не для репозитория. */
const DEFAULT_DIR = resolve(__dirname, '../measurements-partials');

for (const { group, sections, widths } of GROUPS) {
  for (const width of widths) {
    for (const theme of VR_THEMES) {
      test(`измерения ${group} на ${width}px, тема ${theme}`, async ({ page, request }) => {
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
  readonly group: Group;
  readonly stories: readonly StoryEntry[];
  readonly width: number;
  readonly widths: readonly number[];
  readonly theme: (typeof VR_THEMES)[number];
};

type Failure = { readonly story: string; readonly reason: string };

function outcomeDir(): string {
  const configured = process.env.VR_OUTCOME_DIR;
  return configured !== undefined && configured.length > 0 ? configured : DEFAULT_DIR;
}

function failedFileName(run: MeasureRun, shard: Shard | null): string {
  const part = shard === null ? '' : `-s${shard.index}of${shard.total}`;
  return `measure-failed-${run.group}${part}-${run.width}-${run.theme}.json`;
}

/**
 * Файл пропущенных по графу импортов. Имя отдельное от отказов: сборщик
 * различает их по началу имени, и «пропущено осознанно» не должно попасть в
 * отказы — это разные вещи и разный вердикт.
 */
function skippedFileName(run: MeasureRun, shard: Shard | null): string {
  const part = shard === null ? '' : `-s${shard.index}of${shard.total}`;
  return `measure-skipped-${run.group}${part}-${run.width}-${run.theme}.json`;
}

/**
 * Ведомость обхода: пропущенные истории плюс план, по которому эта пара
 * шла, — группа, её ширины и темы, номер доли и сколько долей всего.
 *
 * 🔴 План объявляется, а не выводится сборщиком из встреченного (issue #865).
 * Сборщик считает по ведомостям, полон ли обход, а пул по этому ответу решает,
 * удалять ли файлы измерений. Выведи он ожидаемое из того, что пришло, — пара,
 * не отчитавшаяся ни в одной доле, исчезла бы из ожидаемого вместе со своими
 * историями, и обход назвал бы себя полным. Истории, закреплённые за такой
 * шириной тегом `vr-<N>`, были бы удалены как «ушедшие из витрины».
 */
function ledger(run: MeasureRun, shard: Shard | null, skipped: readonly string[]): string {
  return `${JSON.stringify(
    {
      group: run.group,
      width: run.width,
      theme: run.theme,
      shard: shard === null ? 1 : shard.index,
      shards: shard === null ? 1 : shard.total,
      plan: { widths: [...run.widths], themes: [...VR_THEMES] },
      skipped,
    },
    null,
    2,
  )}\n`;
}

async function measureStories(page: Page, run: MeasureRun): Promise<void> {
  const shard = shardFromEnv();
  const stories = shard === null ? run.stories : shardSlice(run.stories, shard);
  const dir = outcomeDir();
  mkdirSync(dir, { recursive: true });
  const failed: Failure[] = [];
  const skipped: string[] = [];

  /* 🔴 Меряются только истории, до которых правка дотягивается по графу
     импортов (issue #856) — тот же приём и тот же код, что у снимков
     (`snapshot-run.ts`, issue #444). До него правка одной строки в ките
     заставляла заново обходить все истории на каждой паре «ширина + тема».

     🔴 Пропуск обязан быть назван вслух, а не выглядеть пропажей. Сравнение
     считает файл в репозитории без замера удалённой историей и краснеет —
     поэтому пропущенные пишутся списком рядом с отказами, сборщик несёт их в
     отчёт, а сравнение вычитает их из пропавших.

     Всё, чего разбор не понял, задевает всё: `affectedStoryPaths` возвращает
     `null`, и меряется каждая история. */
  const affected = affectedStoryPaths({
    changed: changedFromEnv(),
    storyPaths: stories.flatMap((story) =>
      story.importPath === undefined ? [] : [normaliseStoryPath(story.importPath)],
    ),
  });
  const isAffected = (story: StoryEntry): boolean =>
    affected === null ||
    story.importPath === undefined ||
    affected.has(normaliseStoryPath(story.importPath));

  /* Подготовка та же, что у снимков и инвариантов: подписка на отказы
     сценариев до первого перехода, область просмотра, покой для анимаций и
     замороженное «сейчас» — иначе история приходит к замеру в случайной точке
     своего оживания, и измерения плавают без единой правки кода. */
  await watchPlayFailures(page);
  await page.setViewportSize({ width: run.width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(FROZEN_NOW);

  try {
    for (const story of stories) {
      if (!pinnedWidths(story, run.widths).includes(run.width)) continue;

      if (!isAffected(story)) {
        skipped.push(story.id);
        continue;
      }

      /* Отказ одной истории не обрывает обход: причина записывается, замер
         идёт дальше, а в конце список отказов красит тест целиком. */
      try {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${run.theme}`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForStoryReady(page);
        const partial = await page.evaluate(collectMeasurements, {
          theme: run.theme,
          width: run.width,
        });
        writeFileSync(
          join(dir, `measure-${story.id}--${run.width}-${run.theme}.json`),
          `${JSON.stringify(partial)}\n`,
          'utf8',
        );
      } catch (error) {
        failed.push({ story: story.id, reason: describeError(error) });
      }
    }
  } finally {
    /* Отказы пишутся и когда тест красный: сводной работе они нужны именно
       тогда, а пустой список — тоже факт: «пара дошла до конца». */
    writeFileSync(
      join(dir, failedFileName(run, shard)),
      `${JSON.stringify({ failed }, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(join(dir, skippedFileName(run, shard)), ledger(run, shard, skipped), 'utf8');
  }

  expect(
    failed.map((failure) => `${failure.story}: ${failure.reason}`),
    'истории не дошли до замера — отказ сценария или ожидания готовности',
  ).toEqual([]);
}

function describeError(error: unknown): string {
  return firstLines(error instanceof Error ? error.message : String(error));
}
