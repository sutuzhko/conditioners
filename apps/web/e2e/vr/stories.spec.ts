import { expect, test } from '@playwright/test';

import { VR_THEMES, VR_WIDTHS } from '../../playwright.vr.config';
import { snapshotStories } from './snapshot-run';
import { loadStories } from './story-index';

/**
 * Визуальная регрессия историй Storybook (ADR-021): свой раннер, без Chromatic.
 *
 * 🔴 Снимаются блоки лендинга и страницы, а не весь Storybook. Компоненты кита
 * покрыты тестами поведения и своим раннером панели (`panel.spec.ts`), а
 * регрессию во внешнем виде блока ловит блоковый снимок.
 *
 * 🔴 Эталон не лежит в репозитории (ADR-230). Эталоном служат кадры
 * `merge-base`, которые работа пайплайна снимает тем же контейнером и кладёт
 * в `VR_FRAMES_DIR`; расхождение автор принимает ярлыком на PR, отказ сценария
 * не принимается ничем. Как это устроено — в `snapshot-run.ts`.
 *
 * Локальный прогон против дев-сервера витрины: после установки пакетов
 * перезапустите контейнер Storybook, иначе Vite отдаёт «504 Outdated Optimize
 * Dep» и кадр выходит пустым, а не упавшим.
 */

/** Разделы, которые снимаем. Остальные истории проверяются тестами поведения. */
const SNAPSHOT_SECTIONS = ['Блоки/', 'Страницы/'];

for (const width of VR_WIDTHS) {
  for (const theme of VR_THEMES) {
    test(`истории блоков на ${width}px, тема ${theme}`, async ({ page, request }) => {
      const stories = await loadStories(request, SNAPSHOT_SECTIONS);
      expect(stories.length).toBeGreaterThan(0);

      await snapshotStories(page, { project: 'public', stories, width, widths: VR_WIDTHS, theme });
    });
  }
}
