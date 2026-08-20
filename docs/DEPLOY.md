# DEPLOY — выкладка и эксплуатация

> Обоснование решений: [TECH_DECISIONS.md](TECH_DECISIONS.md) · Чек-лист перед запуском — там же, §19

---

## 1. Что где живёт

**Продакшн:** VPS у российского провайдера (Selectel / Timeweb / REG.RU). Минимально: 2 vCPU, 4 ГБ RAM, 40 ГБ SSD.

**Контейнеры:**

| Сервис | Что делает |
|---|---|
| `caddy` | TLS (Let's Encrypt автоматически), реверс-прокси, отдача статики, gzip/brotli |
| `web` | Next.js в режиме `standalone` |
| `worker` | тот же образ, разбирает очередь уведомлений |
| `db` | PostgreSQL 16, данные в именованном volume |

`worker` отдельным контейнером, чтобы перезапуск веба не рвал доставку уведомлений.

**Volume'ы:** `pgdata` — база · `uploads` — загруженные файлы · `caddy_data` — сертификаты.

---

## 2. Разработка — тот же Docker

🔴 Локальный запуск только через compose. `npm run dev` на хосте не поддерживается: смысл в том, чтобы дев-среда совпадала с боевой (ADR-017, [TECH_DECISIONS §18](TECH_DECISIONS.md)).

```bash
cp .env.example .env.dev            # заполнить; уведомления оставить в режиме «в лог»
docker compose -f docker-compose.dev.yml up --build
```

Поднимется тот же состав, что на проде: `caddy` + `web` + `worker` + `db`. Сайт — на локальном домене через Caddy, а не на голом `localhost:3000`: заголовки, сжатие и проксирование проверяются здесь.

Команды выполняются **внутри контейнера**, никогда с хоста:

```bash
docker compose -f docker-compose.dev.yml exec web npx prisma migrate dev
docker compose -f docker-compose.dev.yml exec web npm run seed
docker compose -f docker-compose.dev.yml exec web npm test
docker compose -f docker-compose.dev.yml exec db psql -U tk -d tulaklimat
```

Что это ловит до деплоя: расхождение версий Node и Postgres, регистр в путях импортов (на macOS `Button` и `button` — одно и то же, в Linux-сборке — нет), права и пути к volume с загрузками, поведение Caddy.

Версии Node и Postgres заданы в одном месте и одинаковы в `docker-compose.dev.yml` и `docker-compose.prod.yml`. Расхождение версий между средами — баг.

---

## 3. Первый запуск на проде

```bash
git clone <repo> /opt/tulaklimat && cd /opt/tulaklimat
cp .env.prod.example .env.prod   # заполнить все значения
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec web npm run seed   # только на пустой базе
```

DNS-записи `A` для домена и `www` должны уже вести на IP сервера — Caddy выпустит сертификат при первом обращении.

---

## 4. Обновление

```bash
cd /opt/tulaklimat && git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

Автодеплой с каждого пуша сознательно не настраивается: на проекте одного разработчика он создаёт больше рисков, чем экономит времени.

---

## 5. Переменные окружения

Полный список с комментариями — в `.env.prod.example`. Ключевые:

| Переменная | Смысл |
|---|---|
| `DATABASE_URL` | строка подключения к Postgres |
| `SITE_URL` | канонический адрес, из него строятся каноникалы, sitemap и OG |
| `SESSION_SECRET` | подпись cookie-сессии админки |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD_HASH` | первый администратор (Argon2id) |
| `SMTP_*`, `NOTIFY_EMAIL_TO` | почтовый канал уведомлений |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | 🔴 только на сервере |
| `TELEGRAM_TRANSPORT` | `direct` \| `proxy` \| `off` |
| `TELEGRAM_PROXY_URL` | адрес прокси при `proxy` |
| `TELEGRAM_WEBHOOK_SECRET` | проверка входящих апдейтов |
| `UPLOADS_DIR` | путь к volume с файлами |
| `YANDEX_METRIKA_ID` | счётчик, единственная публичная переменная |

🔴 Ни одна из них, кроме `NEXT_PUBLIC_*`, не должна попасть в клиентский бандл. ENV проверяется Zod-схемой при старте: приложение не поднимется с неполной конфигурацией.

---

## 6. Проверка Telegram с боевого сервера

Это единственный способ узнать правду о доступности — с локальной машины (тем более через VPN) проверка ничего не значит.

```bash
docker compose -f docker-compose.prod.yml exec web curl -sS -o /dev/null -w "http=%{http_code} tls=%{time_appconnect}s\n" --max-time 10 https://api.telegram.org/
```

| Результат | Действие |
|---|---|
| код 200/302, быстрый handshake | `TELEGRAM_TRANSPORT=direct` |
| таймаут или обрыв TLS | поднять WireGuard-туннель с маршрутизацией `149.154.160.0/20` и `91.108.4.0/22`, либо SOCKS5 на зарубежном VPS → `TELEGRAM_TRANSPORT=proxy` |
| решение отложено | `TELEGRAM_TRANSPORT=off`, работает email |

После включения канала — поставить вебхук (с сервера, тем же транспортом):

```
POST https://api.telegram.org/bot<TOKEN>/setWebhook
  url=https://<домен>/api/telegram/webhook
  secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

---

## 7. Бэкапы

Ежедневно по cron: `pg_dump` + архив `uploads`, хранение 30 дней, **копия на другом диске или в другом месте**, чем боевая база.

Раз в квартал — восстановление на тестовом окружении. Непроверенный бэкап бэкапом не является.

---

## 8. Проверка после выкладки

```bash
curl -s https://<домен>/api/health                    # {"ok":true}
curl -s https://<домен>/ | grep -c "₽"                # цены в HTML, без JS
curl -sI https://<домен>/admin | grep -i x-robots     # noindex
curl -s https://<домен>/robots.txt
curl -s https://<домен>/sitemap.xml | head
```

Затем вручную: тестовая заявка → появилась в админке → пришло письмо → пришло в Telegram (если канал включён). Тестовую заявку после проверки удалить.
