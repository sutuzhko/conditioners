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
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
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
# Схема ENV проверяется при импорте (shared/config/env.ts), а `next build`
# импортирует маршруты, чтобы собрать их. Без этих значений сборка падает ещё
# до первой страницы. Значения заведомо нерабочие и нужны ровно на время
# сборки: боевые приходят из .env.prod при запуске контейнера (ADR-063).
ARG DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
ARG SITE_URL="https://build.invalid"
ARG SESSION_SECRET="build-time-only-not-a-secret"
# 🔴 DATABASE_URL сознательно НЕ становится `ENV`. `ENV` попадает в конфиг
# образа, и `docker inspect` показывал бы боевой пароль базы: compose передаёт
# сюда настоящий BUILD_DATABASE_URL. Сборке адрес нужен ровно на время
# `next build`, поэтому он подставляется переменной одной команды и в слоях не
# остаётся. SITE_URL публичен, а SESSION_SECRET заведомо фиктивный — этим в
# метаданных быть можно.
ENV SITE_URL=$SITE_URL SESSION_SECRET=$SESSION_SECRET
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter web exec prisma generate \
 && DATABASE_URL="$DATABASE_URL" pnpm --filter web build

# ---------- runner ----------
FROM base AS runner
# 🔴 HOSTNAME=0.0.0.0 обязателен. `server.js` из standalone слушает адрес из
# `process.env.HOSTNAME`, а Docker кладёт туда идентификатор контейнера —
# приложение поднималось только на собственном IP контейнера, и healthcheck по
# 127.0.0.1 отвечал «Connection refused» вечно. Следствие тяжелее, чем красный
# статус: `caddy` ждёт `web` здоровым, значит сайт не поднимался вовсе.
# В деве этого не видно: `next dev` слушает 0.0.0.0 и HOSTNAME не читает.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# standalone в воркспейсе раскладывается по тем же путям, что в исходниках
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/prisma ./apps/web/prisma
# Каталог загрузок создаётся в образе с правами приложения: пустой именованный
# том Docker заполняет содержимым и владельцем этого пути. Иначе том достаётся
# root, а процесс под nextjs не может записать в него ни одного файла.
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

# ---------- worker ----------
# Воркер очереди работает с исходником, а не со standalone: там нужны tsx и
# Prisma CLI, которых в боевом образе веба нет и быть не должно. Тот же
# исходник, что в деве, — расхождения поведения очереди между средами взяться
# неоткуда (ADR-062).
#
# 🔴 Растёт из `deps`, а не из `build`. Из `build` образ наследовал `.next`
# целиком и — что хуже — его переменные окружения: строка подключения с боевым
# паролем оставалась в конфиге долгоживущего образа и показывалась
# `docker inspect` (ревью кода 28 августа). Здесь наследовать нечего.
FROM deps AS worker
ENV NODE_ENV=production COREPACK_HOME=/pnpm/corepack
COPY . .
# Воркер ходит во внешнюю сеть и пишет в том загрузок — root ему ни к чему.
# Кеш corepack наполняется заранее под root и открывается на чтение: иначе
# запуск pnpm под nextjs полез бы в сеть за самим pnpm.
RUN corepack prepare && chmod -R a+rX /pnpm/corepack \
 && addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 \
 && mkdir -p /data/uploads && chown -R nextjs:nodejs /data
USER nextjs
# 🔴 Рабочий каталог — пакет, а не корень воркспейса. tsx ищет tsconfig с
# путями `@/*` относительно cwd, и из /app воркер падает на первом же импорте
# `@/server/db`. Раньше каталог задавал `pnpm --filter web`; теперь его задаём
# сами — проверено запуском собранного образа.
WORKDIR /app/apps/web
# 🔴 Напрямую tsx, а не через `pnpm --filter web worker`. Обработчик SIGTERM
# живёт в worker.ts, и между ним и сигналом от Docker не должно быть
# посредника: если pnpm сигнал не пробросит, `stop_grace_period` закончится
# SIGKILL посреди отправки уведомления.
CMD ["node_modules/.bin/tsx", "src/server/notifications/worker.ts"]

# ---------- migrate ----------
# Накатывание схемы не может зависеть от сборки сайта: стадия `build`
# пререндерит страницы с данными и требует уже мигрированную базу (ADR-062),
# а инструмент миграций обязан собираться при пустой — иначе первый деплой
# упирается в круг «миграции требуют образ, образ требует миграций» (ADR-089).
# В deps уже есть Prisma CLI и каталог prisma со схемой и миграциями.
FROM deps AS migrate
ENV NODE_ENV=production COREPACK_HOME=/pnpm/corepack
# Миграциям root тоже не нужен: процесс короткоживущий, но принцип один
RUN corepack prepare && chmod -R a+rX /pnpm/corepack \
 && addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs
CMD ["pnpm", "--filter", "web", "exec", "prisma", "migrate", "deploy"]
