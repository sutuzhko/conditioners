import { defineConfig } from '@playwright/test';

/**
 * Визуальная регрессия: снепшоты историй Storybook на четырёх ширинах
 * в обеих темах (ADR-021). Свой раннер, без Chromatic.
 *
 * Браузер — системный chromium из образа: собственные сборки Playwright для
 * musl не выпускаются (docs/BUGS.md). Путь приходит переменной, чтобы раннер
 * запускался и вне контейнера, где браузеры ставит сам Playwright.
 */
export const VR_WIDTHS = [320, 375, 768, 1200] as const;
export const VR_THEMES = ['light', 'dark'] as const;

// `--no-sandbox`: в контейнере процесс идёт от root, и песочница Chromium
// обрывает загрузку страниц. Изоляция здесь и так контейнерная.
const chromiumPath = process.env.CHROMIUM_PATH;
const launchOptions =
  chromiumPath === undefined
    ? {}
    : {
        executablePath: chromiumPath,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      };

export default defineConfig({
  testDir: './e2e/vr',
  fullyParallel: true,
  retries: 0,
  /* Один тест обходит все истории раздела, поэтому меряется он не секундами.
     Разбивать по тесту на историю нельзя: список приходит из Storybook по
     сети, а Playwright собирает тесты синхронно. */
  timeout: 45 * 60_000,
  workers: 1,
  expect: {
    // снимку нужно время устояться: первая история грузится дольше прочих
    timeout: 20_000,
    // антиалиасинг шрифтов даёт микроразличия между запусками
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: process.env.VR_BASE_URL ?? 'http://storybook:6006',
    launchOptions,
    /* 🔴 Ожидания обязаны иметь предел. По умолчанию у Playwright его нет, и
       одна история, которая не дойдёт до готовности, останавливает прогон
       навсегда: раннер молчит, а не падает (docs/BUGS.md). */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
});
