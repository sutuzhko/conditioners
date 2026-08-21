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

export default defineConfig({
  testDir: './e2e/vr',
  fullyParallel: true,
  retries: 0,
  expect: {
    // антиалиасинг шрифтов даёт микроразличия между запусками
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: process.env.VR_BASE_URL ?? 'http://storybook:6006',
    ...(chromiumPath === undefined
      ? {}
      : {
          launchOptions: {
            executablePath: chromiumPath,
            args: ['--no-sandbox', '--disable-dev-shm-usage'],
          },
        }),
  },
});
