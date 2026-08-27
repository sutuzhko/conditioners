// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const { testEnv } = vi.hoisted(() => ({
  testEnv: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://user:pass@db:5432/test',
    SITE_URL: 'https://example.test',
    SESSION_SECRET: '0123456789abcdef',
    UPLOADS_DIR: '/tmp/tk-test-uploads-binding',
    UPLOAD_MAX_BYTES: 5_242_880,
    NOTIFY_DRIVER: 'log',
    TELEGRAM_TRANSPORT: 'direct',
  } as Record<string, unknown>,
}));

vi.mock('@/shared/config/env', () => ({ env: testEnv }));

const { BINDING_WINDOW_MS, bindingCode, parseChatCommand, verifyBindingCode } =
  await import('./binding');

const NOW = new Date('2026-08-26T12:10:00.000Z');
const LATER = new Date(NOW.getTime() + BINDING_WINDOW_MS);
const MUCH_LATER = new Date(NOW.getTime() + 3 * BINDING_WINDOW_MS);

describe('Код привязки чата', () => {
  it('восемь символов из читаемого алфавита: код диктуют вслух', () => {
    expect(bindingCode('u1', NOW)).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  });

  it('🔴 у каждого свой: чужим кодом чужую учётную запись не привяжешь', () => {
    const mine = bindingCode('u1', NOW);

    expect(bindingCode('u2', NOW)).not.toBe(mine);
    expect(verifyBindingCode('u2', mine, NOW)).toBe(false);
  });

  it('свой код подходит', () => {
    expect(verifyBindingCode('u1', bindingCode('u1', NOW), NOW)).toBe(true);
  });

  it('регистр и пробелы человек путает, смысл кода — нет', () => {
    const code = bindingCode('u1', NOW);

    expect(verifyBindingCode('u1', ` ${code.toLowerCase()} `, NOW)).toBe(true);
  });

  it('код прошлого окна ещё работает: показанный в 10:29 нужен в 10:31', () => {
    expect(verifyBindingCode('u1', bindingCode('u1', NOW), LATER)).toBe(true);
  });

  it('🔴 устаревший код не подходит: право на привязку не бессрочное', () => {
    expect(verifyBindingCode('u1', bindingCode('u1', NOW), MUCH_LATER)).toBe(false);
  });

  it('мусор вместо кода отклоняется, а не роняет разбор', () => {
    expect(verifyBindingCode('u1', 'не код', NOW)).toBe(false);
    expect(verifyBindingCode('u1', '', NOW)).toBe(false);
  });
});

describe('Команда боту', () => {
  it('ссылка из панели приходит как /start с кодом', () => {
    expect(parseChatCommand('/start ABCDEFGH')).toEqual({ kind: 'bind', code: 'ABCDEFGH' });
  });

  it('в группе команда приходит с именем бота', () => {
    expect(parseChatCommand('/start@tk_bot ABCDEFGH')).toEqual({
      kind: 'bind',
      code: 'ABCDEFGH',
    });
  });

  it('человек, которому код продиктовали, шлёт его просто сообщением', () => {
    expect(parseChatCommand('abcdefgh')).toEqual({ kind: 'bind', code: 'ABCDEFGH' });
  });

  it('/start без кода — повод объяснить, где взять код', () => {
    expect(parseChatCommand('/start')).toEqual({ kind: 'help' });
  });

  it('отписка — своя команда', () => {
    expect(parseChatCommand('/stop')).toEqual({ kind: 'unbind' });
  });

  it('обычное сообщение бот не считает командой: он не собеседник', () => {
    expect(parseChatCommand('привет, а когда приедут?')).toBeNull();
    expect(parseChatCommand(undefined)).toBeNull();
  });
});
