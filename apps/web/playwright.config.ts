import { defineConfig, devices } from '@playwright/test';

// Сквозные сценарии гоняются против того же контейнера, что и разработка.
// Браузер системный: сборок Playwright под musl нет, поэтому в дев-образе
// стоит chromium из репозиториев Alpine, а путь приходит переменной.
// `--no-sandbox`: в контейнере процесс идёт от root, и песочница Chromium
// обрывает загрузку страниц. Изоляция здесь и так контейнерная.
const chromiumPath = process.env.CHROMIUM_PATH;
const launchOptions =
  chromiumPath === undefined
    ? {}
    : {
        executablePath: chromiumPath,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* Дев-сервер собирает страницу по первому обращению, и на холодной сборке
     это заметно дольше умолчаний Playwright. Воркеров при этом мало: четыре
     параллельных сборки в одном контейнере душат сервер и друг друга. */
  timeout: 90_000,
  /* Один воркер: рядом в том же контейнере работают дев-сервер и Storybook,
     и второй Chromium с ними в память уже не помещается — вкладка падает
     с «Target crashed». */
  workers: 1,
  use: {
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    baseURL: process.env.E2E_BASE_URL ?? 'http://web:3000',
    trace: 'on-first-retry',
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
