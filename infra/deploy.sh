#!/usr/bin/env bash
# Выкладка одной командой: infra/deploy.sh
#
# Порядок шагов не случаен и не переставляется:
#   база → миграции → сборка → запуск.
# Главная, политика и статьи пререндерятся с данными (ISR), поэтому образ
# собирается при живой и уже мигрированной базе — иначе сборка честно падает,
# вместо того чтобы отдать пустую страницу роботу (ADR-062).
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose --env-file .env.prod -f docker-compose.prod.yml)

if [ ! -f .env.prod ]; then
	echo "🔴 нет .env.prod — скопируй .env.prod.example и заполни" >&2
	exit 1
fi

echo "[1/5] база"
"${COMPOSE[@]}" up -d db

echo "[2/5] жду готовности базы"
for _ in $(seq 1 60); do
	state="$("${COMPOSE[@]}" ps db --format '{{.Health}}' 2>/dev/null || echo '')"
	[ "${state}" = "healthy" ] && break
	sleep 2
done
[ "${state:-}" = "healthy" ] || {
	echo "🔴 база не поднялась" >&2
	exit 1
}

echo "[3/5] миграции"
"${COMPOSE[@]}" run --rm migrate

echo "[4/5] сборка образов"
"${COMPOSE[@]}" build

echo "[5/5] запуск"
"${COMPOSE[@]}" up -d

echo
echo "Проверка:"
echo "  curl -s https://\$SITE_DOMAIN/api/health"
echo "  docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
