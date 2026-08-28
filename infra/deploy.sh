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

# 🔴 Предполётная проверка: одиночный `$` в значении.
#
# docker compose интерполирует значения из env-файла, и `$argon2id` для него —
# переменная окружения, которой нет. Хеш Argon2id содержит `$` всегда, поэтому
# незамеченная ошибка означает ровно одно: после выкладки в панель не пускает
# верный пароль. Правильная запись — удвоенный `$$`, в контейнер приезжает `$`.
#
# Документацию читают один раз, а этот шаг отрабатывает на каждом деплое.
singles="$(awk -F= '
	/^[[:space:]]*#/ { next }
	!/=/             { next }
	{
		value = $0
		sub(/^[^=]*=/, "", value)
		gsub(/\$\$/, "", value)
		if (index(value, "$") > 0) printf "  строка %d: %s\n", FNR, $1
	}
' .env.prod)"

if [ -n "${singles}" ]; then
	echo "🔴 в .env.prod остался одиночный \$ — compose съест его при подстановке:" >&2
	echo "${singles}" >&2
	echo "   удвой каждый \$: ADMIN_PASSWORD_HASH=\$\$argon2id\$\$v=19\$\$m=… (см. .env.prod.example)" >&2
	exit 1
fi

echo "[1/6] база"
"${COMPOSE[@]}" up -d db

echo "[2/6] жду готовности базы"
for _ in $(seq 1 60); do
	state="$("${COMPOSE[@]}" ps db --format '{{.Health}}' 2>/dev/null || echo '')"
	[ "${state}" = "healthy" ] && break
	sleep 2
done
[ "${state:-}" = "healthy" ] || {
	echo "🔴 база не поднялась" >&2
	exit 1
}

echo "[3/6] дамп перед миграциями"
# Упавшая миграция лечится руками (migrate resolve, DEPLOY.md §4), и для
# этого нужен срез «за минуту до», а не вчерашний ночной бэкап. На первом
# деплое дамп пустой схемы — это нормально.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tulaklimat}"
mkdir -p "${BACKUP_DIR}"
"${COMPOSE[@]}" exec -T db \
	sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
	>"${BACKUP_DIR}/predeploy_$(date +%Y-%m-%d_%H-%M).dump"
# срезы перед деплоем живут по тем же правилам, что ночные (infra/backup.sh)
find "${BACKUP_DIR}" -maxdepth 1 -name 'predeploy_*.dump' -mtime "+${KEEP_DAYS:-30}" -delete

echo "[4/6] миграции"
# --build обязателен: без него run берёт образ прошлого релиза, и свежие
# миграции применяются не до сборки, а вместе с запуском (ADR-089)
"${COMPOSE[@]}" run --build --rm migrate

echo "[5/6] сборка образов"
"${COMPOSE[@]}" build

echo "[6/6] запуск"
"${COMPOSE[@]}" up -d

# Слои прошлых сборок копятся по 8–10 ГБ и без чистки съедают диск VPS
echo "[после] чистка старых слоёв образов"
docker image prune -f >/dev/null

echo
echo "Проверка:"
echo "  curl -s https://\$SITE_DOMAIN/api/health"
echo "  docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
