import { describe, expect, it } from 'vitest';

import { PERSON_TONES, initialsOf, personTone } from './palette';

describe('цвет человека в календаре', () => {
  it('🔴 не меняется от вызова к вызову: краска закреплена за человеком', () => {
    expect(personTone('cmta5ovbh')).toBe(personTone('cmta5ovbh'));
  });

  it('не зависит от порядка в списке — только от номера учётной записи', () => {
    const first = ['u2', 'u3', 'u4'].map(personTone);
    const shuffled = ['u4', 'u2', 'u3'].map(personTone);

    expect(shuffled[1]).toBe(first[0]);
    expect(shuffled[0]).toBe(first[2]);
  });

  it('всегда даёт краску из палитры, даже на пустом номере', () => {
    for (const id of ['', 'u1', 'cmta7q1x0', 'Дмитрий']) {
      expect(PERSON_TONES).toContain(personTone(id));
    }
  });

  it('разводит соседние номера по разным краскам', () => {
    const tones = new Set(['u1', 'u2', 'u3', 'u4'].map(personTone));

    expect(tones.size).toBeGreaterThan(1);
  });
});

describe('инициалы', () => {
  it('берёт по букве от имени и фамилии', () => {
    expect(initialsOf('Дмитрий Соколов')).toBe('ДС');
  });

  it('одно слово даёт одну букву', () => {
    expect(initialsOf('Дмитрий')).toBe('Д');
  });

  it('логин латиницей тоже годится: имени может не быть', () => {
    expect(initialsOf('dmitry')).toBe('D');
  });

  it('лишние пробелы не дают пустых букв', () => {
    expect(initialsOf('  Пётр   Иванович  Лапин ')).toBe('ПИ');
  });

  it('пустая подпись не роняет метку', () => {
    expect(initialsOf('   ')).toBe('');
  });
});
