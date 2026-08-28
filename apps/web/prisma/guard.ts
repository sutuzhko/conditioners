/**
 * Предохранитель демонстрационного сида.
 *
 * 🔴 `seed:demo` стирает семнадцать таблиц безусловным `deleteMany()` и
 * перезаписывает настройки компании выдуманными. На боевой базе это потеря
 * данных владельца, а команда исполнима физически: стадия `migrate` собрана из
 * `deps`, где есть и `tsx`, и `prisma/`, а в docs/DEPLOY.md рядом стоит почти
 * буквально та же команда с `seed` вместо `seed:demo`.
 *
 * Признаков три, и главный из них — третий. `NODE_ENV` и `SITE_URL` отвечают на
 * вопрос «кем я себя считаю»; `DATABASE_URL` — на вопрос «куда я на самом деле
 * пишу», и он честнее. Дев-контейнер или туннель, смотрящий в боевую базу, —
 * не выдуманный сценарий: порт Postgres в проде намеренно проброшен на петлю
 * «для psql при разборе инцидента» (docker-compose.prod.yml). В нём
 * `NODE_ENV=development`, `SITE_URL=http://…`, и два первых признака молчат.
 *
 * Вынесено из `seed-demo.ts` отдельным модулем, потому что защита от потери
 * боевых данных обязана быть покрыта тестом, а импорт самого сида запустил бы
 * его целиком.
 */

/** Что знает предохранитель об окружении. Ровно три значения, ничего больше. */
export type SeedEnvironment = {
  readonly nodeEnv: string;
  readonly siteUrl: string;
  readonly databaseUrl: string;
};

/**
 * Хосты, которые заведомо не боевые: сервис compose дев-состава и петля.
 *
 * 🔴 Список закрытый, а не список исключений. Ошибиться в сторону отказа —
 * потерять минуту; ошибиться в другую — потерять базу.
 */
const LOCAL_DB_HOSTS: ReadonlySet<string> = new Set(['db', 'localhost', '127.0.0.1', '::1']);

/**
 * Хост строки подключения.
 *
 * 🔴 Разбор схемой, а не поиском подстроки: `host` — это именно хост.
 * `postgresql://user:pass@boevoy.example.ru/localhost` содержит «localhost»
 * и не имеет к петле никакого отношения, а `db.example.ru` начинается на «db».
 *
 * `null` — адрес не разобрался. Это тоже причина отказать: непонятная строка
 * подключения не повод стирать таблицы.
 */
function databaseHost(databaseUrl: string): string | null {
  try {
    const { hostname } = new URL(databaseUrl);
    if (hostname === '') return null;
    // URL отдаёт IPv6 в скобках — сравнивать удобнее без них
    return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  } catch {
    return null;
  }
}

/**
 * Причины, по которым окружение считается боевым. Пустой список — можно писать.
 *
 * Возвращается список, а не флаг: человеку, у которого сид отказался
 * работать, нужно знать, что именно его выдало.
 */
export function productionReasons(source: SeedEnvironment): readonly string[] {
  const reasons: string[] = [];

  if (source.nodeEnv === 'production') reasons.push('NODE_ENV=production');

  if (source.siteUrl.startsWith('https://')) {
    reasons.push(`SITE_URL=${source.siteUrl} — боевой сайт отдаётся по https`);
  }

  const host = databaseHost(source.databaseUrl);
  if (host === null) {
    reasons.push('DATABASE_URL не разбирается как адрес — куда пишем, неизвестно');
  } else if (!LOCAL_DB_HOSTS.has(host)) {
    reasons.push(
      `DATABASE_URL смотрит на «${host}» — это не дев-база ` +
        `(допустимы ${[...LOCAL_DB_HOSTS].join(', ')})`,
    );
  }

  return reasons;
}
