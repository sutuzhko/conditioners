import { expect, test, type APIRequestContext } from '@playwright/test';

import { VR_THEMES, VR_WIDTHS } from '../../playwright.vr.config';

/**
 * Визуальная регрессия историй Storybook (ADR-021): свой раннер, без Chromatic.
 *
 * 🔴 Снимаются блоки лендинга и страницы, а не весь Storybook: 128 историй из
 * 281. Компоненты кита покрыты тестами поведения и меняются вместе с блоками —
 * регрессию во внешнем виде ловит блоковый снимок.
 *
 * Эталонов в репозитории пока нет — первый прогон их создаёт:
 * `pnpm --filter web vr --update-snapshots`. Четыре ширины в двух темах дают
 * порядка тысячи PNG, и хранить ли их в репозитории — решение владельца
 * (docs/BUGS.md); до него они в `.gitignore`.
 *
 * 🔴 Перед прогоном перезапустите контейнер Storybook. Vite держит кеш
 * оптимизированных зависимостей, и после установки пакетов истории отдают
 * «504 Outdated Optimize Dep» — снимок при этом выходит пустым, а не
 * упавшим.
 */

/** Разделы, которые снимаем. Остальные истории проверяются тестами поведения. */
const SNAPSHOT_SECTIONS = ['Блоки/', 'Страницы/'];

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
