#!/usr/bin/env bash
# Бэкап боевых данных: дамп базы и архив загруженных файлов.
#
# Запускается с хоста, из каталога проекта, обычно по cron:
#   0 3 * * * cd /opt/tulaklimat && infra/backup.sh >> /var/log/tulaklimat-backup.log 2>&1
#
# 🔴 Каталог назначения должен лежать на другом диске или на другой машине:
# бэкап рядом с базой не переживёт ровно тот случай, ради которого он делался.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
PROJECT="${COMPOSE_PROJECT_NAME:-tulaklimat}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/tulaklimat}"
KEEP_DAYS="${KEEP_DAYS:-30}"

# Compose интерполирует обязательные переменные файла при любой команде —
# без env-файла вызов падает до pg_dump, и cron молчит об этом ночами
if [ ! -f "${ENV_FILE}" ]; then
	echo "🔴 нет ${ENV_FILE} — бэкап без окружения compose не работает" >&2
	exit 1
fi

stamp="$(date +%Y-%m-%d_%H-%M)"
db_file="${BACKUP_DIR}/db_${stamp}.dump"
files_file="${BACKUP_DIR}/uploads_${stamp}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date +%H:%M:%S)] дамп базы → ${db_file}"
# -Fc — сжатый формат: восстанавливается через pg_restore выборочно и быстрее,
# чем простыня SQL. Пользователь и база берутся из окружения контейнера.
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T db \
	sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >"${db_file}"

echo "[$(date +%H:%M:%S)] архив загрузок → ${files_file}"
# Том монтируется в разовый контейнер: файлы отдаёт приложение, но лежат они
# в томе, и добраться до них с хоста иначе нельзя.
docker run --rm \
	-v "${PROJECT}_uploads:/data:ro" \
	-v "${BACKUP_DIR}:/backup" \
	"${ALPINE_IMAGE:-alpine:3.20}" \
	tar czf "/backup/$(basename "${files_file}")" -C /data .

# Пустой дамп — это молчаливая потеря данных: проверяем, что файл не обрубок
if [ ! -s "${db_file}" ]; then
	echo "🔴 дамп базы пуст — бэкап не состоялся" >&2
	exit 1
fi

echo "[$(date +%H:%M:%S)] чистка старше ${KEEP_DAYS} дней"
find "${BACKUP_DIR}" -maxdepth 1 -name 'db_*.dump' -mtime "+${KEEP_DAYS}" -delete
find "${BACKUP_DIR}" -maxdepth 1 -name 'uploads_*.tar.gz' -mtime "+${KEEP_DAYS}" -delete

echo "[$(date +%H:%M:%S)] готово: $(du -h "${db_file}" | cut -f1) база, $(du -h "${files_file}" | cut -f1) файлы"
