import { expect, test, type APIRequestContext } from '@playwright/test';

import { VR_THEMES, VR_WIDTHS } from '../../playwright.vr.config';

/**
 * Визуальная регрессия историй Storybook (ADR-021): свой раннер, без Chromatic.
 *
 * 🔴 Снимаются блоки лендинга и страницы, а не весь Storybook. Историй 281, и
 * полный охват четырьмя ширинами в двух темах — это больше двух тысяч PNG в
 * репозитории. Компоненты кита покрыты тестами поведения и меняются вместе с
 * блоками: регрессию во внешнем виде ловит блоковый снимок.
 *
 * Эталонов в репозитории пока нет — первый прогон их создаёт:
 * `pnpm --filter web vr --update-snapshots`. Решение о хранении принимает
 * владелец: это десятки мегабайт двоичных файлов (docs/BUGS.md).
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
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);

        /* Ждём саму историю, а не «тишину в сети»: Storybook держит открытое
           соединение горячей перезагрузки, и `networkidle` не наступает
           никогда — прогон упирался в таймаут на каждой истории. */
        const root = page.locator('#storybook-root');
        await root.waitFor();
        await expect(root).not.toBeEmpty();

        /* Мягкая проверка: одна разошедшаяся история не должна прятать
           остальные — иначе каждый прогон показывает только первую поломку. */
        await expect.soft(root).toHaveScreenshot(`${story.id}--${width}-${theme}.png`, {
          animations: 'disabled',
          caret: 'hide',
        });
      }
    });
  }
}
