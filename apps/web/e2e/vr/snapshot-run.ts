import { expect, test, type Page } from '@playwright/test';

import { emptyTally, firstLines, recordErrors, writeOutcome, type RunOutcome } from './outcome';
import { loadBaseStoryIds, pinnedWidths, type StoryEntry } from './story-index';
import { waitForStoryReady, watchPlayFailures } from './story-ready';

/**
 * Обход историй одной пары «ширина + тема» — общий для публичного раннера и
 * раннера панели (ADR-230).
 *
 * Раньше цикл стоял двумя копиями в двух спеках, и первая же правка развела
 * их: панель ждала окончания анимаций, публичный раннер — нет. Здесь один
 * цикл, а спеки задают только раздел, ширины и тему.
 *
 * 🔴 Эталон — кадры `merge-base`, снятые тем же контейнером и тем же раннером
 * в той же работе пайплайна. Работа кладёт их в каталог `VR_FRAMES_DIR` и
 * рядом — `index.json` базовой витрины (`VR_BASE_INDEX`): история, которой в
 * базе нет, новая, и сравнивать её не с чем — она проходит навигацию и
 * ожидание готовности, но кадр с эталоном не сверяется. Итог прогона по
 * категориям уходит в `VR_OUTCOME_DIR`: по нему работа решает, красить ли PR
 * (расхождение кадра принимает ярлык, отказ сценария — ничто).
 *
 * Без этих переменных раннер сравнивает все истории с кадрами в каталоге
 * рядом со спеками — так идёт локальный прогон. Каталог в репозиторий не
 * попадает: он в `.gitignore`.
 */

/**
 * «Сейчас» для снимков — одно на оба раннера. Значение произвольно, но
 * обязано быть постоянным: от него зависит и действующая скидка в фикстуре
 * каталога (она действует по 31 октября 2026), и год в подвале. Плавающее
 * «сейчас» разводило бы кадры базы и ветки без единой правки кода.
 */
export const FROZEN_NOW = new Date('2026-08-29T09:00:00.000Z');

export type SnapshotRun = {
  readonly project: RunOutcome['project'];
  readonly stories: readonly StoryEntry[];
  /** Ширина этого теста. */
  readonly width: number;
  /** Все ширины проекта — набор, из которого берутся теги `vr-<ширина>`. */
  readonly widths: readonly number[];
  readonly theme: string;
};

export async function snapshotStories(page: Page, run: SnapshotRun): Promise<void> {
  const baseIds = loadBaseStoryIds();
  const tally = emptyTally();

  /* Подписка на отказы сценариев ставится до первого перехода: она
     работает через `addInitScript`, то есть на будущие загрузки. */
  await watchPlayFailures(page);

  await page.setViewportSize({ width: run.width, height: 900 });

  /* Снимок обязан быть неподвижным. CSS-анимации гасит сам Playwright, а
     живой фон, бегущая лента доверия и счётчики цифр рисуются скриптом и
     слушают `prefers-reduced-motion` — без этой эмуляции кадры не совпадают
     между собой, и снимок ждёт стабилизации до таймаута. */
  await page.emulateMedia({ reducedMotion: 'reduce' });

  /* Часы только подменяют «сейчас»: таймеры продолжают идти, и ожидание
     готовности истории не зависает. */
  await page.clock.setFixedTime(FROZEN_NOW);

  try {
    for (const story of run.stories) {
      if (!pinnedWidths(story, run.widths).includes(run.width)) continue;

      /* 🔴 Отказ одной истории не обрывает обход. Раньше первый же отказ
         сценария бросал исключение из середины цикла, и остальные истории этой
         пары «ширина + тема» не снимались вовсе — прогон показывал одну поломку
         и прятал следующие. Причина записывается, обход идёт дальше; в конце
         список отказов красит тест целиком. */
      try {
        /* Ждём разбор разметки, а не событие `load`: у дев-сервера витрины
           открыто соединение горячей перезагрузки, и ни `load`, ни `networkidle`
           там не наступают. */
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${run.theme}`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForStoryReady(page);
      } catch (error) {
        tally.failed.push({ story: story.id, reason: describeError(error) });
        continue;
      }

      if (baseIds !== null && !baseIds.has(story.id)) {
        tally.new.push(story.id);
        continue;
      }

      /* Снимается область просмотра, а не контейнер истории: у пустых историй
         его не снять, а регрессия «блок исчез» как раз и видна на общем кадре.
         Проверка мягкая — одна разошедшаяся история не должна прятать
         остальные. Что именно случилось, мягкая проверка не возвращает: она
         дописывает ошибку в `test.info().errors`, и категория читается оттуда. */
      const before = test.info().errors.length;
      tally.compared += 1;
      await expect.soft(page).toHaveScreenshot(`${story.id}--${run.width}-${run.theme}.png`, {
        animations: 'disabled',
        caret: 'hide',
      });
      const messages = test
        .info()
        .errors.slice(before)
        .map((error) => error.message ?? 'ошибка без сообщения');
      recordErrors(tally, story.id, messages);
    }
  } finally {
    /* Итог пишется и когда тест красный: работе он нужен именно тогда. */
    const outcomeDir = process.env.VR_OUTCOME_DIR;
    if (outcomeDir !== undefined && outcomeDir.length > 0) {
      writeOutcome(outcomeDir, {
        project: run.project,
        width: run.width,
        theme: run.theme,
        compared: tally.compared,
        changed: tally.changed,
        new: tally.new,
        failed: tally.failed,
      });
    }
  }

  expect(
    tally.failed.map((failure) => `${failure.story}: ${failure.reason}`),
    'истории не дошли до снимка — отказ сценария или ожидания готовности',
  ).toEqual([]);
}

function describeError(error: unknown): string {
  return firstLines(error instanceof Error ? error.message : String(error));
}
