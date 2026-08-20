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
};

export default config;
