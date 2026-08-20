import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Хеширование argon2 и пережатие через sharp считаются честно и упираются
    // в процессор. При параллельной работе нескольких агентов дефолтные 5 секунд
    // дают ложные падения — тест, падающий от загрузки машины, бесполезен.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Vitest по умолчанию занимает все ядра, а рядом в том же контейнере живут
    // dev-сервер и Storybook. На восьми ядрах это давало плавающие падения
    // тестов с таймингом — они проходят изолированно и падают в общем прогоне.
    // Половина ядер надёжнее, чем быстрый, но неверящий себе прогон.
    poolOptions: { threads: { maxThreads: 4, minThreads: 1 } },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
