import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { productionReasons } from './guard';

import { settingKeySchema } from '../src/entities/settings/model';

/** Рабочее окружение стенда: дев-контейнер, http, база — сервис compose. */
const DEV = {
  nodeEnv: 'development',
  siteUrl: 'http://tulaklimat.localhost',
  databaseUrl: 'postgresql://tk:devpass@db:5432/tulaklimat?schema=public',
} as const;

describe('предохранитель демо-сида', () => {
  it('на дев-окружении не возражает', () => {
    expect(productionReasons(DEV)).toEqual([]);
  });

  it('видит production по NODE_ENV', () => {
    const reasons = productionReasons({ ...DEV, nodeEnv: 'production' });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('NODE_ENV=production');
  });

  it('видит боевой сайт по https', () => {
    const reasons = productionReasons({ ...DEV, siteUrl: 'https://tulaklimat.ru' });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('https');
  });

  /* 🔴 Главная проверка: дев-контейнер или туннель, смотрящий в боевую базу.
     NODE_ENV и SITE_URL здесь дев-овые — молчат оба прежних признака. */
  it('отказывается писать в чужую базу при дев-окружении', () => {
    const reasons = productionReasons({
      ...DEV,
      databaseUrl: 'postgresql://tk:parol@89.108.77.14:5432/tulaklimat?schema=public',
    });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toContain('89.108.77.14');
  });

  it.each([
    ['localhost', 'postgresql://tk:devpass@localhost:5432/tulaklimat'],
    ['127.0.0.1', 'postgresql://tk:devpass@127.0.0.1:5432/tulaklimat'],
    ['db', 'postgresql://tk:devpass@db:5432/tulaklimat'],
    ['[::1]', 'postgresql://tk:devpass@[::1]:5432/tulaklimat'],
  ])('пропускает петлю и сервис compose: %s', (_name, databaseUrl) => {
    expect(productionReasons({ ...DEV, databaseUrl })).toEqual([]);
  });

  /* 🔴 Разбор схемой, а не поиском подстроки. Оба адреса содержат разрешённое
     слово и ведут при этом наружу — ровно так проверка «строка содержит
     localhost» и пропускала бы боевую базу. */
  it.each([
    ['имя базы притворяется петлёй', 'postgresql://tk:parol@boevoy.example.ru:5432/localhost'],
    ['поддомен начинается на db', 'postgresql://tk:parol@db.example.ru:5432/tulaklimat'],
    ['пользователь назван localhost', 'postgresql://localhost:parol@example.ru:5432/tk'],
  ])('не обманывается подстрокой: %s', (_name, databaseUrl) => {
    expect(productionReasons({ ...DEV, databaseUrl })).toHaveLength(1);
  });

  it.each([
    ['пустая строка', ''],
    ['мусор', 'не адрес вовсе'],
    ['без хоста', 'postgresql:///tulaklimat'],
  ])('отказывает при неразбираемом адресе: %s', (_name, databaseUrl) => {
    expect(productionReasons({ ...DEV, databaseUrl })).toHaveLength(1);
  });

  it('перечисляет все причины разом, а не первую попавшуюся', () => {
    const reasons = productionReasons({
      nodeEnv: 'production',
      siteUrl: 'https://tulaklimat.ru',
      databaseUrl: 'postgresql://tk:parol@10.0.0.5:5432/tulaklimat',
    });
    expect(reasons).toHaveLength(3);
  });
});

/**
 * Демо-сид обязан заводить **все** группы настроек.
 *
 * 🔴 Шапка `seed-demo.ts` обещает работу «в том числе на пустой базе после
 * `prisma migrate reset`». Обещание держится только пока в сиде есть каждая
 * группа из реестра: `checkReadiness` на отсутствующей даёт `ready: false`, а
 * публичный layout при неготовности вешает `robots: { index: false }` — то
 * есть весь сайт остаётся под `noindex`, и заметить это можно только по
 * выдаче через неделю (issue #101).
 *
 * Проверяется текст сида, а не запуск: сид пишет в базу, а вопрос здесь —
 * какие ключи он вообще знает.
 */
describe('демо-сид и реестр настроек', () => {
  it('🔴 заводит каждую группу настроек — иначе стенд остаётся под noindex', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'seed-demo.ts'),
      'utf8',
    );

    const start = source.indexOf('const settings: Record<string, Prisma.InputJsonValue> = {');
    expect(start).toBeGreaterThan(-1);

    /* Границу объекта ищем по балансу скобок: внутри лежат вложенные объекты
       и массивы, и первая же `}` — не его конец. */
    let depth = 0;
    let end = source.indexOf('{', start);
    for (let i = end; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    const body = source.slice(source.indexOf('{', start) + 1, end);
    const seeded = [...body.matchAll(/^ {2}([a-zA-Z]+):/gm)].map(([, key]) => key);

    expect([...settingKeySchema.options].sort()).toEqual([...seeded].sort());
  });
});
