#!/bin/sh
# Прогон тестов, зависящих от изменённых файлов, — внутри контейнера (ADR-147).
#
# 🔴 Почему не на хосте, хотя это было бы быстрее. Хост — не та среда, в
# которой живёт проект (ADR-017), и расходится с ней двумя способами сразу:
# у него свой `node_modules` со своим клиентом Prisma, сгенерированным когда-то
# давно, и у него нет переменных окружения из compose. Оба расхождения дают
# падения на исправном коде — `Cannot read properties of undefined (reading
# 'findMany')` на новой модели схемы и «Некорректная конфигурация окружения»
# на десятке серверных файлов. Проверка, падающая на здоровом коде, хуже
# отсутствующей: её обходят через `--no-verify`, а вместе с ней обходят
# линтеры.
#
# Пути приходят от lint-staged абсолютными, от корня хоста; в контейнере
# репозиторий лежит в /app, поэтому префикс заменяется.

[ $# -eq 0 ] && exit 0

root=$(git rev-parse --show-toplevel)
compose="docker compose -f $root/docker-compose.dev.yml"

if [ -z "$($compose ps -q web 2>/dev/null)" ]; then
  echo "Контейнер web не поднят — тесты прогнать негде."
  echo "docker compose -f docker-compose.dev.yml up -d"
  exit 1
fi

# Абсолютными: `pnpm --filter web` уводит cwd в /app/apps/web, и путь от корня
# репозитория там разрешился бы вторым `apps/web` внутри первого.
files=""
for path in "$@"; do
  files="$files /app/${path#"$root"/}"
done

# shellcheck disable=SC2086 -- список путей обязан разбиться на аргументы
$compose exec -T web pnpm --filter web exec vitest related --run $files
