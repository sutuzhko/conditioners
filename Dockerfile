# Общий образ для разработки и прода: дев и прод собираются из одного базового слоя,
# чтобы среды не расходились (ADR-017, docs/TECH_DECISIONS.md §18).

# Базовый образ вынесен в аргумент: на проде это Docker Hub, локально может
# понадобиться зеркало (см. .env.example, NODE_IMAGE) — некоторые сети не пускают
# демон Docker к CDN Docker Hub.
ARG NODE_IMAGE=node:22-alpine

# ---------- base ----------
FROM ${NODE_IMAGE} AS base
# openssl нужен Prisma, libc6-compat — нативным зависимостям Next на alpine
RUN apk add --no-cache openssl libc6-compat
# Store — в томе контейнера, а не рядом с проектом: путь задаётся здесь, а не
# в .npmrc, потому что тот же файл читает pnpm на macOS, и абсолютный
# контейнерный путь ломал установку на хосте (ADR-028).
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH PNPM_STORE_DIR=/pnpm/store
RUN corepack enable
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile || pnpm install
COPY apps/web/prisma ./apps/web/prisma
RUN pnpm --filter web exec prisma generate

# ---------- dev ----------
FROM base AS dev
ENV NODE_ENV=development
# git нужен lint-staged и husky: хуки выполняются внутри контейнера,
# потому что на хосте нет node_modules (ADR-017). В боевой образ не попадает.
#
# chromium — системный, из репозиториев Alpine: собственные сборки Playwright
# для musl не выпускаются, и снепшот-тесты историй запускать было негде
# (ADR-021, BUGS). Шрифты идут вместе с ним: без них снимок получается с
# квадратами вместо кириллицы. Всё это только в дев-стадии — боевой образ
# остаётся прежним.
RUN apk add --no-cache git chromium nss freetype harfbuzz ttf-freefont font-noto \
 && git config --system --add safe.directory /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    CHROMIUM_PATH=/usr/bin/chromium
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
EXPOSE 3000 6006
CMD ["pnpm", "--filter", "web", "dev"]

# ---------- build ----------
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter web exec prisma generate && pnpm --filter web build

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# standalone в воркспейсе раскладывается по тем же путям, что в исходниках
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/prisma ./apps/web/prisma
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
