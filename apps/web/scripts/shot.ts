#!/usr/bin/env node
/**
 * Снимок страниц дев-стенда в PNG.
 *
 * 🔴 Зачем инструмент: разработка идёт по SSH, браузера у сессии нет — иначе
 * свёрстанную страницу увидеть невозможно, и каждая правка вёрстки упирается
 * в глаза владельца. Chromium в дев-образе уже стоит ради снепшот-тестов
 * (ADR-021), новой зависимости не появляется.
 *
 * Это не замена визуальной регрессии: та сравнивает истории Storybook с
 * эталонами и падает, здесь же снимок нужен, чтобы посмотреть.
 *
 * Тема не подставляется в localStorage: инлайн-скрипт в <head> при пустом
 * хранилище берёт её из prefers-color-scheme (см. layout.tsx), поэтому
 * достаточно эмуляции схемы — и ключ хранилища не расползается ещё по
 * одному файлу.
 *
 * Запуск внутри контейнера web:
 *   pnpm --filter web shot / --theme both
 *   pnpm --filter web shot /admin/leads --admin --width 1200
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { BASE_URL } from '../e2e/support/admin-api';
import { loginViaUi } from '../e2e/support/admin-ui';

const THEMES = ['light', 'dark'] as const;
type Theme = (typeof THEMES)[number];

/** Умолчание — рабочий стол и телефон: две ширины, на которых смотрят чаще всего. */
const DEFAULT_WIDTHS = [1200, 375] as const;
const VIEWPORT_HEIGHT = 900;

/* Дев-сервер собирает страницу по первому обращению, и на холодной сборке это
   заметно дольше умолчаний Playwright — те же 60 секунд, что в playwright.config. */
const NAVIGATION_TIMEOUT = 60_000;
/* Живой фон и счётчики дорисовываются после готовности шрифтов: без паузы в
   кадр попадает середина анимации. Эмуляция reduced-motion гасит не всё. */
const SETTLE_MS = 400;

const HERE = dirname(fileURLToPath(import.meta.url));

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    width: { type: 'string' },
    theme: { type: 'string' },
    out: { type: 'string' },
    base: { type: 'string' },
    full: { type: 'boolean' },
    admin: { type: 'boolean' },
  },
});

const paths = positionals.length > 0 ? positionals : ['/'];

const widths =
  values.width === undefined
    ? [...DEFAULT_WIDTHS]
    : values.width.split(',').map((raw) => {
        const width = Number.parseInt(raw.trim(), 10);
        if (Number.isNaN(width) || width < 200) fail(`ширина «${raw}» не похожа на число пикселей`);
        return width;
      });

const themes: readonly Theme[] =
  values.theme === undefined || values.theme === 'light'
    ? ['light']
    : values.theme === 'dark'
      ? ['dark']
      : values.theme === 'both'
        ? THEMES
        : fail(`тема «${values.theme}»: ожидается light, dark или both`);

const baseUrl = values.base ?? BASE_URL;
const outDir = values.out === undefined ? resolve(HERE, '..', '.screenshots') : resolve(values.out);

/** Имя файла из адреса: `/knowledge/split-vs-inverter` → `knowledge-split-vs-inverter`. */
function nameOf(path: string): string {
  const pathname = path.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '');
  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  // Буквы любого алфавита остаются: слаги статей владелец задаёт по-русски
  return segments.length === 0 ? 'home' : segments.join('-').replace(/[^\p{L}\p{N}_-]+/gu, '-');
}

/**
 * Готовность кадра. `networkidle` не подходит: дев-сервер держит открытым
 * соединение горячей перезагрузки, и простоя сети не наступает никогда.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load', { timeout: NAVIGATION_TIMEOUT }).catch(() => {
    /* картинка могла не догрузиться — снимок с ней всё равно полезнее отказа */
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Cookie сессии добывается один раз: вход через форму ждёт гидрации и на
 * дев-сервере занимает секунды, а контекстов здесь — ширины на темы.
 */
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

async function adminState(browser: Browser): Promise<StorageState> {
  const context = await browser.newContext({ baseURL: baseUrl });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

  try {
    await loginViaUi(page);
    return await context.storageState();
  } finally {
    await context.close();
  }
}

/* Тот же системный chromium, что у сквозных тестов: сборок Playwright под musl
   не выпускается, путь приходит переменной из дев-образа. `--no-sandbox` —
   процесс в контейнере идёт от root, и песочница обрывает загрузку страниц. */
const chromiumPath = process.env.CHROMIUM_PATH;
const launchOptions =
  chromiumPath === undefined
    ? {}
    : {
        executablePath: chromiumPath,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      };

// Обёртка в main — не украшение: tsx исполняет .ts воркспейса как CJS
// (в package.json нет "type": "module"), а верхнеуровневый await там запрещён.
async function main(): Promise<void> {
  const browser = await chromium.launch(launchOptions);
  await mkdir(outDir, { recursive: true });

  const storageState = values.admin === true ? await adminState(browser) : undefined;
  const failures: string[] = [];

  for (const theme of themes) {
    for (const width of widths) {
      const context: BrowserContext = await browser.newContext({
        baseURL: baseUrl,
        colorScheme: theme,
        reducedMotion: 'reduce',
        viewport: { width, height: VIEWPORT_HEIGHT },
        // exactOptionalPropertyTypes: свойства просто нет, когда входа не было
        ...(storageState === undefined ? {} : { storageState }),
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

      for (const path of paths) {
        const file = join(outDir, `${nameOf(path)}--${width}-${theme}.png`);
        try {
          const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
          await settle(page);
          await page.screenshot({
            path: file,
            fullPage: values.full === true,
            animations: 'disabled',
            caret: 'hide',
          });

          // Статус печатается всегда: снимок страницы с ошибкой выглядит как
          // страница, и без этой строки 500 легко принять за вёрстку.
          const status = response === null ? '—' : response.status();
          console.log(`${status}  ${file}`);
        } catch (error) {
          const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
          failures.push(`${path} (${width}px, ${theme}): ${reason}`);
          console.error(`✗ ${path} (${width}px, ${theme}): ${reason}`);
        }
      }

      await context.close();
    }
  }

  await browser.close();

  if (failures.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
