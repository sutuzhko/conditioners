/**
 * Стенд рабочего дерева: арифметика смещения и правка файлов окружения.
 *
 * 🔴 Проверяется прежде всего то, что дороже всего ошибиться: смещение 0
 * обязано давать ровно те порты и то имя проекта, что были зашиты до
 * параметризации. Сдвинься любое из них — владелец завтра не найдёт свой стенд,
 * а команда сноса погасит не тот проект.
 */
import { createServer } from 'node:net';

import { describe, expect, it } from 'vitest';

import {
  BASE_PORTS,
  MAIN_OFFSET,
  MAX_OFFSET,
  StandError,
  busyPorts,
  carryEnvValues,
  claimsWithDocker,
  composeArgs,
  doubleDollars,
  envRefusal,
  freeOffsets,
  hostDatabaseUrl,
  mainRootFromCommonDir,
  mergeStandEnv,
  nextFreeOffset,
  offsetClaims,
  offsetTaken,
  parseComposeProjects,
  parseEnvText,
  parseOffset,
  parseWorktrees,
  portVerdict,
  probePort,
  readEnvValue,
  readStandOffset,
  renderStandEnv,
  setEnvValue,
  standDatabaseUrl,
  standPorts,
  standPortsFrom,
  standProject,
  standRow,
  standSiteUrl,
  standSuffix,
} from './stand.mjs';

describe('смещение', () => {
  it.each(['0', '1', '9', 0, 5])('принимает %s', (raw) => {
    expect(parseOffset(raw)).toBe(Number(raw));
  });

  it.each(['', ' ', '-1', '2.5', 'два', '01a', null, undefined])('отказывает на %s', (raw) => {
    expect(() => parseOffset(raw)).toThrow(StandError);
  });

  it('отказывает выше потолка', () => {
    expect(() => parseOffset(MAX_OFFSET + 1)).toThrow(/больше предельного/);
  });
});

describe('порты стенда', () => {
  it('у стенда владельца остаются прежними', () => {
    expect(standPorts(MAIN_OFFSET)).toEqual(BASE_PORTS);
    expect(standPorts(0)).toMatchObject({ http: 80, https: 443, web: 3000, db: 5432 });
  });

  it('сдвигаются на десять за каждое смещение', () => {
    expect(standPorts(1)).toEqual({
      http: 90,
      https: 453,
      web: 3010,
      storybook: 6016,
      db: 5442,
      dbTest: 5443,
      e2e: 3111,
    });
    expect(standPorts(2).web).toBe(3020);
  });

  it('не сталкиваются ни у каких двух стендов', () => {
    const seen = new Map();
    for (let offset = MAIN_OFFSET; offset <= MAX_OFFSET; offset += 1) {
      for (const [key, port] of Object.entries(standPorts(offset))) {
        expect(seen.has(port), `порт ${port}: ${seen.get(port)} и ${offset}/${key}`).toBe(false);
        seen.set(port, `${offset}/${key}`);
      }
    }
  });

  it('база и база сценариев расходятся на всех смещениях', () => {
    for (let offset = MAIN_OFFSET; offset <= MAX_OFFSET; offset += 1) {
      const ports = standPorts(offset);
      expect(ports.dbTest).not.toBe(ports.db);
    }
  });
});

describe('имя проекта', () => {
  it('у стенда владельца — прежнее, без суффикса', () => {
    expect(standProject(0)).toBe('conditioner-dev');
    expect(standSuffix(0)).toBe('');
  });

  it('у смещённого — с номером', () => {
    expect(standProject(3)).toBe('conditioner-dev-3');
    expect(standSuffix(3)).toBe('-3');
  });
});

describe('адреса', () => {
  it('у стенда владельца адрес без порта — так он записан в документации', () => {
    expect(standSiteUrl(0)).toBe('http://tulaklimat.localhost');
  });

  it('у смещённого адрес несёт порт Caddy', () => {
    expect(standSiteUrl(2)).toBe('http://tulaklimat.localhost:100');
    expect(standSiteUrl(2, 'host')).toBe('http://localhost:3020');
  });

  it('изнутри сети compose база всегда на db:5432, смещение ни при чём', () => {
    expect(standDatabaseUrl(4)).toContain('@db:5432/');
  });

  it('с машины — через опубликованный порт своего стенда', () => {
    expect(standDatabaseUrl(4, 'host')).toContain('@127.0.0.1:5472/');
    expect(standDatabaseUrl(4, 'host-test')).toContain('@127.0.0.1:5473/');
  });
});

describe('блок стенда в .env', () => {
  it('дописывается к файлу, ничего не отняв', () => {
    const before = 'NODE_IMAGE=mirror.gcr.io/library/node:22-alpine\n';
    const after = mergeStandEnv(before, 2);
    expect(after).toContain('NODE_IMAGE=mirror.gcr.io/library/node:22-alpine');
    expect(readStandOffset(after)).toBe(2);
    expect(readEnvValue(after, 'STAND_PORT_WEB')).toBe('3020');
    expect(readEnvValue(after, 'STAND_SUFFIX')).toBe('-2');
  });

  it('переписывается целиком, а не дублируется', () => {
    const once = mergeStandEnv('POSTGRES_IMAGE=postgres:16-alpine\n', 1);
    const twice = mergeStandEnv(once, 5);
    expect(readStandOffset(twice)).toBe(5);
    expect(twice.match(/STAND_OFFSET=/g)).toHaveLength(1);
    expect(twice).toContain('POSTGRES_IMAGE=postgres:16-alpine');
  });

  it('сохраняет то, что дописано после блока', () => {
    const withTail = `${mergeStandEnv('', 1)}CADDY_IMAGE=caddy:2.8-alpine\n`;
    const again = mergeStandEnv(withTail, 2);
    expect(again).toContain('CADDY_IMAGE=caddy:2.8-alpine');
    expect(readStandOffset(again)).toBe(2);
  });

  it('отказывается чинить незакрытый блок', () => {
    const broken = mergeStandEnv('', 1).replace(/# <<< .*\n/, '');
    expect(() => mergeStandEnv(broken, 2)).toThrow(/открыт и не закрыт/);
  });

  it('без блока смещения не знает', () => {
    expect(readStandOffset('NODE_IMAGE=node:22-alpine')).toBeNull();
  });

  it('🔴 испорченное смещение — отказ, а не «стенда нет»', () => {
    /* Молчаливый null здесь означал бы «гасить нечего»: снос удалил бы каталог
       вместе с файлом окружения, а контейнеры и тома остались бы сиротами
       навсегда — имя проекта после этого взять неоткуда. */
    expect(() => readStandOffset('STAND_OFFSET=две')).toThrow(StandError);
    expect(() => readStandOffset('STAND_OFFSET=42')).toThrow(/испорчено STAND_OFFSET/);
  });
});

describe('правка переменной окружения', () => {
  const sample = ['# почему именно так', 'SITE_URL=http://localhost:3000', '', 'PORT=1'].join('\n');

  it('меняет значение на месте, не трогая объяснение рядом', () => {
    const next = setEnvValue(sample, 'SITE_URL', 'http://localhost:3020');
    expect(next.split('\n')[0]).toBe('# почему именно так');
    expect(next.split('\n')[1]).toBe('SITE_URL=http://localhost:3020');
    expect(readEnvValue(next, 'PORT')).toBe('1');
  });

  it('дописывает недостающую переменную', () => {
    expect(readEnvValue(setEnvValue(sample, 'UPLOADS_DIR', '/tmp/u'), 'UPLOADS_DIR')).toBe(
      '/tmp/u',
    );
  });

  it('не принимает закомментированную строку за значение', () => {
    expect(readEnvValue('# SITE_URL=https://boevoy', 'SITE_URL')).toBeNull();
  });

  it('разбирает файл в пары', () => {
    expect(parseEnvText('A=1\n# B=2\n\nC = 3\nD=\n')).toEqual({ A: '1', D: '' });
  });
});

describe('доллары в хеше пароля', () => {
  it('удваиваются для compose', () => {
    expect(doubleDollars('$argon2id$v=19$m=19456')).toBe('$$argon2id$$v=19$$m=19456');
  });
});

describe('разбор git worktree list', () => {
  const porcelain = [
    'worktree /repo',
    'HEAD abc',
    'branch refs/heads/release',
    '',
    'worktree /repo/.claude/worktrees/fix-pager',
    'HEAD def',
    'branch refs/heads/fix/pager-scroll',
    '',
    'worktree /repo/.claude/worktrees/detached',
    'HEAD 111',
    'detached',
    '',
  ].join('\n');

  it('находит все деревья и их ветки', () => {
    const found = parseWorktrees(porcelain);
    expect(found).toHaveLength(3);
    expect(found[1]).toEqual({
      path: '/repo/.claude/worktrees/fix-pager',
      branch: 'fix/pager-scroll',
      bare: false,
    });
    expect(found[2].branch).toBeNull();
  });

  it('на пустом выводе не падает', () => {
    expect(parseWorktrees('')).toEqual([]);
  });
});

describe('корень основного дерева', () => {
  it('снимается с общего каталога git', () => {
    expect(mainRootFromCommonDir('/repo/.git')).toBe('/repo');
  });

  it('у голого репозитория совпадает с самим каталогом', () => {
    expect(mainRootFromCommonDir('/repo.git')).toBe('/repo.git');
  });
});

describe('занятые смещения', () => {
  const all = [
    { path: '/repo', offset: 0 },
    { path: '/repo/.claude/worktrees/a', offset: 1 },
    { path: '/repo/.claude/worktrees/b', offset: null },
  ];

  it('считаются по деревьям, а не по контейнерам', () => {
    const claims = offsetClaims(all);
    expect(claims.get(0)).toEqual(['/repo']);
    expect(claims.get(1)).toEqual(['/repo/.claude/worktrees/a']);
    expect(claims.has(2)).toBe(false);
  });

  it('свободным считается первое незанятое после нулевого', () => {
    expect(freeOffsets(offsetClaims(all))[0]).toBe(2);
    expect(nextFreeOffset(offsetClaims(all))).toBe(2);
  });

  it('чужое смещение — отказ с именем захватчика', () => {
    const taken = offsetTaken(1, offsetClaims(all), '/repo/.claude/worktrees/new');
    expect(taken).toContain('/repo/.claude/worktrees/a');
    expect(taken).toContain('уже занято');
  });

  it('своё же смещение не мешает: повторная настройка законна', () => {
    expect(offsetTaken(1, offsetClaims(all), '/repo/.claude/worktrees/a')).toBeNull();
  });

  it('когда свободных нет — отказ, а не смещение сверх потолка', () => {
    const full = offsetClaims(
      Array.from({ length: MAX_OFFSET + 1 }, (_, offset) => ({ path: `/t${offset}`, offset })),
    );
    expect(() => nextFreeOffset(full)).toThrow(/свободных смещений нет/);
  });
});

describe('состав блока стенда', () => {
  const block = renderStandEnv(3);

  it('называет и смещение, и все семь портов', () => {
    expect(block).toContain('STAND_OFFSET=3');
    expect(block).toContain('STAND_SUFFIX=-3');
    expect(block).toContain('STAND_PORT_HTTP=110');
    expect(block).toContain('STAND_PORT_HTTPS=473');
    expect(block).toContain('STAND_PORT_WEB=3030');
    expect(block).toContain('STAND_PORT_STORYBOOK=6036');
    expect(block).toContain('STAND_PORT_DB=5462');
    expect(block).toContain('STAND_PORT_DB_TEST=5463');
    expect(block).toContain('STAND_PORT_E2E=3131');
  });

  it('несёт адрес стенда — по нему человек и открывает сайт', () => {
    expect(block).toContain('http://tulaklimat.localhost:110');
  });
});

describe('порты, прочитанные из .env', () => {
  it('берутся из файла — из того же, что читает compose', () => {
    const text = 'STAND_PORT_WEB=3999\nSTAND_PORT_E2E=3777\n';
    expect(standPortsFrom(text, 1).web).toBe(3999);
    expect(standPortsFrom(text, 1).e2e).toBe(3777);
  });

  it('где строки нет — умолчание из формулы, как подстановка в compose', () => {
    expect(standPortsFrom('STAND_PORT_WEB=3999', 1).db).toBe(5442);
    expect(standPortsFrom('', 2)).toEqual(standPorts(2));
  });

  it('мусор в значении не принимается за порт', () => {
    expect(standPortsFrom('STAND_PORT_DB=восемь', 1).db).toBe(5442);
  });
});

describe('🔴 проба порта', () => {
  it('занятым считает только EADDRINUSE', () => {
    expect(portVerdict({ code: 'EADDRINUSE' })).toBe('busy');
  });

  it('нехватку прав занятостью не считает', () => {
    /* Порты ниже 1024 обычному процессу недоступны, а Caddy стенда публикуется
       на 80 и 443. Считай мы EACCES занятостью — полный состав не поднялся бы
       никогда, ни на одной машине и ни на одном смещении. */
    expect(portVerdict({ code: 'EACCES' })).toBe('unknown');
    expect(portVerdict({ code: 'EPERM' })).toBe('unknown');
    expect(portVerdict({ code: 'EADDRNOTAVAIL' })).toBe('unknown');
  });

  it('без ошибки порт свободен', () => {
    expect(portVerdict(null)).toBe('free');
  });

  it('на живом сокете отвечает «занято», после закрытия — «свободно»', async () => {
    const held = createServer();
    const port = await new Promise((done) => {
      held.listen(0, '127.0.0.1', () => done(held.address().port));
    });
    expect(await probePort(port)).toBe('busy');
    await new Promise((done) => held.close(done));
    expect(await probePort(port)).toBe('free');
  });
});

describe('🔴 занятые порты стенда', () => {
  const verdicts = (map) => async (port) => map[port] ?? 'free';

  it('полный состав поднимается, когда привилегированные порты не проверить', async () => {
    const ports = standPorts(2);
    const probe = verdicts({ [ports.http]: 'unknown', [ports.https]: 'unknown' });
    expect(await busyPorts(2, 'full', probe)).toEqual([]);
  });

  it('настоящую занятость по-прежнему видит', async () => {
    const ports = standPorts(2);
    const probe = verdicts({ [ports.db]: 'busy', [ports.http]: 'unknown' });
    expect(await busyPorts(2, 'full', probe)).toEqual([{ key: 'db', port: ports.db }]);
  });

  it('в режиме одной базы смотрит только на неё', async () => {
    const ports = standPorts(2);
    const probe = verdicts({ [ports.web]: 'busy' });
    expect(await busyPorts(2, 'db', probe)).toEqual([]);
  });
});

describe('🔴 аргументы docker compose', () => {
  it('стенду владельца достаётся прежнее имя проекта', () => {
    expect(composeArgs('/repo', 0).slice(0, 3)).toEqual([
      'compose',
      '--project-name',
      'conditioner-dev',
    ]);
  });

  it('смещённому — своё, и снос томов уходит в него, а не в базу владельца', () => {
    expect(composeArgs('/repo', 3)).toContain('conditioner-dev-3');
    expect(composeArgs('/repo', 3)).not.toContain('conditioner-dev');
  });

  it('файл и каталог проекта берутся у названного дерева', () => {
    const args = composeArgs('/repo/.claude/worktrees/a', 1);
    expect(args).toContain('/repo/.claude/worktrees/a/docker-compose.dev.yml');
    expect(args).toContain('/repo/.claude/worktrees/a');
  });

  it('профиль test добавляется только по просьбе', () => {
    expect(composeArgs('/repo', 1)).not.toContain('--profile');
    expect(composeArgs('/repo', 1, { withTestProfile: true })).toContain('test');
  });
});

describe('проекты, которые помнит демон Docker', () => {
  it('узнаёт стенды по имени проекта', () => {
    const json = JSON.stringify([
      { Name: 'conditioner-dev', Status: 'running(5)' },
      { Name: 'conditioner-dev-3', Status: 'exited(1)' },
      { Name: 'что-то-чужое', Status: 'running(1)' },
    ]);
    expect(parseComposeProjects(json)).toEqual([0, 3]);
  });

  it('на невнятном ответе честно говорит «не знаю»', () => {
    expect(parseComposeProjects('не json')).toBeNull();
    expect(parseComposeProjects('')).toBeNull();
    expect(parseComposeProjects('{"Name":"conditioner-dev"}')).toBeNull();
  });

  it('🔴 контейнеры без дерева занимают смещение', () => {
    /* Дерево, снесённое rm -rf мимо worktree:rm, уносит .env, но оставляет
       тома: смещение выглядит свободным, а новый стенд поднимается на чужой
       базе. */
    const claims = claimsWithDocker(offsetClaims([{ path: '/repo', offset: 0 }]), [0, 4]);
    expect(claims.has(4)).toBe(true);
    expect(claims.get(4)[0]).toContain('conditioner-dev-4');
    expect(freeOffsets(claims)).not.toContain(4);
  });

  it('без демона притязания остаются как были', () => {
    const only = offsetClaims([{ path: '/repo', offset: 0 }]);
    expect(claimsWithDocker(only, null)).toBe(only);
  });
});

describe('🔴 писать ли окружение стенда', () => {
  const claims = offsetClaims([
    { path: '/repo', offset: 0 },
    { path: '/repo/.claude/worktrees/a', offset: 1 },
  ]);

  it('в основном дереве — отказ: там окружение владельца', () => {
    expect(envRefusal({ tree: '/repo', main: '/repo', offset: 2, claims })).toContain(
      'основное дерево',
    );
  });

  it('смещение 0 рабочему дереву не отдаётся', () => {
    expect(
      envRefusal({ tree: '/repo/.claude/worktrees/b', main: '/repo', offset: 0, claims }),
    ).toContain('стенд владельца');
  });

  it('чужое смещение — отказ с именем захватчика', () => {
    expect(
      envRefusal({ tree: '/repo/.claude/worktrees/b', main: '/repo', offset: 1, claims }),
    ).toContain('/repo/.claude/worktrees/a');
  });

  it('своё дерево и свободное смещение — можно', () => {
    expect(
      envRefusal({ tree: '/repo/.claude/worktrees/b', main: '/repo', offset: 2, claims }),
    ).toBeNull();
  });

  it('--force снимает любой из отказов', () => {
    expect(envRefusal({ tree: '/repo', main: '/repo', offset: 0, claims, force: true })).toBeNull();
  });
});

describe('перенос зеркал образов в новое дерево', () => {
  const source = 'NODE_IMAGE=mirror.gcr.io/library/node:22-alpine\nPOSTGRES_IMAGE=зеркало\n';

  it('🔴 переносит то, что владелец задал у себя', () => {
    /* Без зеркал на VPN не скачивается ни один образ, а новый .env пишется с
       нуля и содержал бы только блок стенда. */
    const next = carryEnvValues(renderStandEnv(1), source);
    expect(readEnvValue(next, 'NODE_IMAGE')).toBe('mirror.gcr.io/library/node:22-alpine');
    expect(readEnvValue(next, 'POSTGRES_IMAGE')).toBe('зеркало');
  });

  it('не выдумывает того, чего в источнике нет', () => {
    expect(readEnvValue(carryEnvValues(renderStandEnv(1), source), 'CADDY_IMAGE')).toBeNull();
  });

  it('своё значение дерева не перетирает', () => {
    const mine = setEnvValue(renderStandEnv(1), 'NODE_IMAGE', 'node:22-alpine');
    expect(readEnvValue(carryEnvValues(mine, source), 'NODE_IMAGE')).toBe('node:22-alpine');
  });

  it('блок стенда после переноса цел', () => {
    expect(readStandOffset(carryEnvValues(renderStandEnv(1), source))).toBe(1);
  });
});

describe('строка таблицы стендов', () => {
  it('показывает смещение, проект и порты', () => {
    const row = standRow({ offset: 2, path: '/repo/.claude/worktrees/a', main: false });
    expect(row).toContain('conditioner-dev-2');
    expect(row).toContain('3020');
    expect(row).toContain('5452');
    expect(row).toContain('/repo/.claude/worktrees/a');
  });

  it('основное дерево помечено', () => {
    expect(standRow({ offset: 0, path: '/repo', main: true })).toContain('(основное)');
  });

  it('дерево без стенда не выдаёт себя за нулевое', () => {
    const row = standRow({ offset: null, path: '/repo/x', main: false });
    expect(row).toContain('стенд не настроен');
    expect(row).not.toContain('conditioner-dev');
  });

  it('испорченный .env виден в списке, а не молчит', () => {
    expect(standRow({ offset: null, broken: true, path: '/repo/x' })).toContain('испорчен');
  });
});

describe('база с машины по номеру порта', () => {
  it('строится вокруг того порта, что дали', () => {
    expect(hostDatabaseUrl(5443)).toBe(
      'postgresql://tk:devpass@127.0.0.1:5443/tulaklimat?schema=public',
    );
  });

  it('совпадает с тем, что считает standDatabaseUrl', () => {
    expect(hostDatabaseUrl(standPorts(2).dbTest)).toBe(standDatabaseUrl(2, 'host-test'));
  });
});
