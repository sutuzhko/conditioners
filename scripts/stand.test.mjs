/**
 * Стенд рабочего дерева: арифметика смещения и правка файлов окружения.
 *
 * 🔴 Проверяется прежде всего то, что дороже всего ошибиться: смещение 0
 * обязано давать ровно те порты и то имя проекта, что были зашиты до
 * параметризации. Сдвинься любое из них — владелец завтра не найдёт свой стенд,
 * а команда сноса погасит не тот проект.
 */
import { describe, expect, it } from 'vitest';

import {
  BASE_PORTS,
  MAIN_OFFSET,
  MAX_OFFSET,
  StandError,
  doubleDollars,
  freeOffsets,
  mainRootFromCommonDir,
  mergeStandEnv,
  nextFreeOffset,
  offsetClaims,
  offsetTaken,
  parseEnvText,
  parseOffset,
  parseWorktrees,
  readEnvValue,
  readStandOffset,
  setEnvValue,
  standDatabaseUrl,
  standPorts,
  standProject,
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
    expect(readStandOffset('STAND_OFFSET=неверно')).toBeNull();
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
