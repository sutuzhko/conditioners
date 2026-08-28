import { describe, expect, it } from 'vitest';

import { productionReasons } from './guard';

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
