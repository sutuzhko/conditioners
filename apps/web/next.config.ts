import { join } from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // standalone нужен продовому образу: в него уезжает минимальный набор файлов
  output: 'standalone',
  // в воркспейсе трассировка файлов должна начинаться от корня репозитория,
  // иначе standalone соберётся без общих зависимостей
  outputFileTracingRoot: join(import.meta.dirname, '../..'),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // типизированные маршруты: опечатка в href ловится компилятором
  typedRoutes: true,
  experimental: {
    // 🔴 `forbidden()` из `next/navigation` — единственный способ отдать со
    // страницы честный 403 (issue #353). Без флага он бросает ошибку сборки,
    // а без него самого отказ приходится изображать разворотом: 307 с телом
    // чужого раздела, который браузер выбрасывает, а `curl` читает (ADR-095).
    authInterrupts: true,
  },
};

export default config;
