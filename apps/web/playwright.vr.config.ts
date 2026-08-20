import { defineConfig } from '@playwright/test';

/**
 * Визуальная регрессия: снепшоты историй Storybook на четырёх ширинах
 * в обеих темах (ADR-021). Свой раннер, без Chromatic.
 */
export const VR_WIDTHS = [320, 375, 768, 1200] as const;
export const VR_THEMES = ['light', 'dark'] as const;

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
  },
});
