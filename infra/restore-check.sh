#!/usr/bin/env bash
# Проверка восстановления. Непроверенный бэкап бэкапом не является:
# дамп поднимается в одноразовый Postgres, отдельный от боевого, и там же
# проверяется, что данные на месте.
#
#   infra/restore-check.sh /var/backups/tulaklimat/db_2026-08-22_03-00.dump
#
# Боевую базу скрипт не трогает вообще — это его главное свойство.
# Восстановление в боевую делается руками, осознанно: docs/DEPLOY.md §7.
set -euo pipefail

dump="${1:-}"
if [ -z "${dump}" ] || [ ! -s "${dump}" ]; then
	echo "Укажи файл дампа: infra/restore-check.sh <файл .dump>" >&2
	exit 1
fi

POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
container="tulaklimat-restore-check-$$"
password="restore-check"

cleanup() {
	docker rm -f "${container}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[1/4] одноразовый Postgres"
docker run -d --rm --name "${container}" \
	-e POSTGRES_PASSWORD="${password}" \
	-e POSTGRES_USER=check \
	-e POSTGRES_DB=check \
	"${POSTGRES_IMAGE}" >/dev/null

for _ in $(seq 1 30); do
	if docker exec "${container}" pg_isready -U check -d check >/dev/null 2>&1; then break; fi
	sleep 1
done

echo "[2/4] восстановление дампа"
# --no-owner: владелец боевой базы в одноразовой не существует и не нужен
docker exec -i "${container}" pg_restore --no-owner -U check -d check <"${dump}"

echo "[3/4] схема на месте"
# Таблицы, без которых сайт не работает: заявки, отзывы, настройки, очередь.
# Отсутствие любой означает, что восстановился не тот дамп или не целиком.
for table in Lead Review Setting Notification Product Article; do
	docker exec "${container}" psql -qtAX -U check -d check \
		-c "SELECT to_regclass('public.\"${table}\"') IS NOT NULL" | grep -qx t ||
		{
			echo "🔴 в дампе нет таблицы ${table}" >&2
			exit 1
		}
done

echo "[4/4] что внутри"
docker exec "${container}" psql -tAX -U check -d check -c "
  SELECT 'заявок: '     || (SELECT count(*) FROM \"Lead\")
      || ', отзывов: '  || (SELECT count(*) FROM \"Review\")
      || ', товаров: '  || (SELECT count(*) FROM \"Product\")
      || ', статей: '   || (SELECT count(*) FROM \"Article\")
      || ', настроек: ' || (SELECT count(*) FROM \"Setting\");"

echo "✅ дамп восстанавливается. Отметь дату проверки в docs/DEPLOY.md §7"
