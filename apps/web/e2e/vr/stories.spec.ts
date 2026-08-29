import { expect, test, type APIRequestContext } from '@playwright/test';

import { VR_THEMES, VR_WIDTHS } from '../../playwright.vr.config';

/**
 * Визуальная регрессия историй Storybook (ADR-021): свой раннер, без Chromatic.
 *
 * 🔴 Снимаются блоки лендинга и страницы, а не весь Storybook: 171 история из
 * 734. Компоненты кита покрыты тестами поведения и меняются вместе с блоками —
 * регрессию во внешнем виде ловит блоковый снимок.
 *
 * 🔴 Эталоны лежат в репозитории (ADR-168) и обновляются осознанно:
 * `pnpm --filter web vr --update-snapshots` — только вместе с той правкой
 * вёрстки, которая их изменила, и в том же коммите. Изменение внешнего вида
 * обязано быть видно в диффе и проходить ревью вместе с кодом.
 *
 * 🔴 Снимаются эталоны в дев-образе, а не на хосте: шрифты на macOS и в alpine
 * отрисовываются по-разному, и эталон с хоста не совпадёт с прогоном CI ни
 * разу. Пайплайн гоняет снимки тем же образом (работа `vr` в ci.yml).
 *
 * 🔴 Перед прогоном перезапустите контейнер Storybook. Vite держит кеш
 * оптимизированных зависимостей, и после установки пакетов истории отдают
 * «504 Outdated Optimize Dep» — снимок при этом выходит пустым, а не
 * упавшим.
 */

/** Разделы, которые снимаем. Остальные истории проверяются тестами поведения. */
const SNAPSHOT_SECTIONS = ['Блоки/', 'Страницы/'];

/**
 * «Сейчас» для снимков — день, когда сняты эталоны. Значение произвольно, но
 * обязано быть постоянным: от него зависит и действующая скидка в фикстуре, и
 * год в подвале. Менять его — значит пересобирать эталоны, поэтому оно живёт
 * константой на виду, а не подставляется по месту.
 */
const FROZEN_NOW = new Date('2026-08-29T09:00:00.000Z');

type StoryEntry = {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly name: string;
};

async function loadStories(request: APIRequestContext): Promise<readonly StoryEntry[]> {
  const response = await request.get('/index.json');
  expect(response.status(), 'Storybook не отвечает — поднимите контейнер storybook').toBe(200);

  const index: unknown = await response.json();
  const entries = (index as { entries?: Record<string, StoryEntry> }).entries ?? {};

  return Object.values(entries).filter(
    (entry) =>
      entry.type === 'story' &&
      SNAPSHOT_SECTIONS.some((section) => entry.title.startsWith(section)),
  );
}

for (const width of VR_WIDTHS) {
  for (const theme of VR_THEMES) {
    test(`истории блоков на ${width}px, тема ${theme}`, async ({ page, request }) => {
      const stories = await loadStories(request);
      expect(stories.length).toBeGreaterThan(0);

      await page.setViewportSize({ width, height: 900 });

      /* Снимок обязан быть неподвижным. CSS-анимации гасит сам Playwright, а
         живой фон, бегущая лента доверия и счётчики цифр рисуются скриптом и
         слушают `prefers-reduced-motion` — без этой эмуляции кадры не
         совпадают между собой, и снимок ждёт стабилизации до таймаута. */
      await page.emulateMedia({ reducedMotion: 'reduce' });

      /* 🔴 Время замораживается, иначе эталоны протухают сами по себе.
         Скидка в фикстуре каталога действует по 31 октября 2026 — первого
         ноября каждый снимок карточки со скидкой разойдётся с эталоном, хотя
         никто ничего не менял. Год в подвале живёт по тому же календарю.
         Красный прогон без причины — это ровно тот фоновый шум, из-за которого
         пайплайн три дня никто не читал (ADR-167).

         Часы только подменяют «сейчас»: таймеры продолжают идти, и ожидание
         готовности истории не зависает. */
      await page.clock.setFixedTime(FROZEN_NOW);

      for (const story of stories) {
        /* Ждём разбор разметки, а не событие `load`: Storybook держит открытое
           соединение горячей перезагрузки, и ни `load`, ни `networkidle` в деве
           не наступают. */
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`, {
          waitUntil: 'domcontentloaded',
        });

        /* Готовность объявляет сам Storybook: `sb-show-main` появляется, когда
           история отрисована, `sb-show-preparing-story` уходит, когда она
           доготовилась. Ждать видимости `#storybook-root` нельзя — у историй
           с пустым состоянием («Главная — следа нет») он честно нулевой
           высоты, и ожидание не кончается никогда (docs/BUGS.md). */
        await page.waitForFunction(() => {
          const { classList } = document.body;
          return (
            classList.contains('sb-show-main') && !classList.contains('sb-show-preparing-story')
          );
        });

        /* Снимается область просмотра, а не контейнер истории: у пустых
           историй его не снять, а регрессия «блок исчез» как раз и видна на
           общем кадре. Проверка мягкая — одна разошедшаяся история не должна
           прятать остальные, иначе прогон показывает только первую поломку. */
        await expect.soft(page).toHaveScreenshot(`${story.id}--${width}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
        });
      }
    });
  }
}
