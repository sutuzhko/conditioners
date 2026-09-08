import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_CLEANUP_TRAIL,
  ACTIVITY_SECTIONS,
  ACTIVITY_SECTION_TITLES,
  activityActionSchema,
  activityActionsOfSection,
  activityCleanupPeriod,
  activityCleanupSchema,
  activityFilterOf,
  activityFilterOn,
  activityFilterQuery,
  activityImmutableFieldsIn,
  activityNoteSchema,
  activityPeriod,
  activityPeriodKey,
  activitySectionOf,
  EMPTY_ACTIVITY_FILTER,
} from './model';

describe('раздел события', () => {
  it('раздел — левая часть ключа действия', () => {
    expect(activitySectionOf('review.unpublish')).toBe('review');
  });

  /* Ключ без точки приезжает из прошлой версии кода: журнал показывает его как
     есть и обязан хотя бы отнести к какому-то разделу, а не потерять строку. */
  it('ключ без точки — сам себе раздел', () => {
    expect(activitySectionOf('legacy')).toBe('legacy');
  });

  /**
   * 🔴 Список разделов отбора собран руками, и это единственное место, где он
   * может отстать от действий. Проверка собирает разделы из самих действий:
   * новое действие с новым разделом красит её, пока раздел не внесли в отбор.
   */
  it('в отборе есть все разделы, из которых пишутся события', () => {
    const fromActions = new Set(activityActionSchema.options.map(activitySectionOf));

    expect(new Set(ACTIVITY_SECTIONS)).toEqual(fromActions);
  });

  it('у каждого раздела отбора есть русская подпись', () => {
    const named = ACTIVITY_SECTIONS.filter((section) => ACTIVITY_SECTION_TITLES[section] !== '');

    expect(named).toEqual(ACTIVITY_SECTIONS);
  });

  /* 🔴 Отбор уходит в базу списком действий, а не сравнением с началом строки:
     индекс по `action` префикс не обслуживает. Список обязан быть полным —
     иначе отбор молча теряет часть событий раздела. */
  it('действия раздела перечисляются целиком', () => {
    expect(activityActionsOfSection('review')).toEqual([
      'review.publish',
      'review.unpublish',
      'review.reject',
      'review.archive',
    ]);
  });

  it('у незнакомого раздела действий нет, а не все подряд', () => {
    expect(activityActionsOfSection('склад')).toEqual([]);
  });
});

describe('отбор из адреса', () => {
  it('читает все шесть условий', () => {
    const filter = activityFilterOf({
      actor: 'u2',
      role: 'manager',
      section: 'review',
      entity: 'review',
      from: '2026-09-01',
      to: '2026-09-07',
    });

    expect(filter).toEqual({
      actor: 'u2',
      role: 'manager',
      section: 'review',
      entity: 'review',
      from: '2026-09-01',
      to: '2026-09-07',
    });
  });

  /* 🔴 Адрес правят руками и присылают друг другу: мусор снимает условие, а не
     роняет раздел (issue #341). */
  it('мусор в любом условии снимает его, а не роняет разбор', () => {
    const filter = activityFilterOf({
      role: 'директор',
      section: 'бухгалтерия',
      entity: 'счёт',
      from: '31 февраля',
      to: '2026-13-01',
    });

    expect(filter).toEqual(EMPTY_ACTIVITY_FILTER);
  });

  it('пустой отбор не даёт ни одного параметра адреса', () => {
    expect(activityFilterQuery(EMPTY_ACTIVITY_FILTER)).toEqual({});
    expect(activityFilterOn(EMPTY_ACTIVITY_FILTER)).toBe(false);
  });

  /* Разбивка несёт условия за собой: без этого вторая страница найденного
     показывает весь журнал. */
  it('условия возвращаются в адрес теми же ключами, какими пришли', () => {
    const params = { actor: 'u2', role: 'manager', section: 'review', from: '2026-09-01' };

    expect(activityFilterQuery(activityFilterOf(params))).toEqual(params);
    expect(activityFilterOn(activityFilterOf(params))).toBe(true);
  });
});

describe('период — календарный, по московской полуночи', () => {
  /**
   * 🔴 Граница дня считается по Туле, а не по UTC (ADR-080). Контейнер живёт в
   * UTC, и «за 8 сентября» по его полуночи потеряло бы три часа суток —
   * события с 21:00 седьмого числа уехали бы в восьмое.
   */
  it('начало периода — московская полночь первого дня', () => {
    const { since } = activityPeriod({ from: '2026-09-08', to: undefined });

    expect(since?.toISOString()).toBe('2026-09-07T21:00:00.000Z');
  });

  /* 🔴 Верхняя граница исключающая — полночь следующих суток. С `lte` на
     последней миллисекунде дня терялись бы события, записанные внутри неё. */
  it('конец периода — московская полночь следующего дня, не последняя миллисекунда', () => {
    const { until } = activityPeriod({ from: undefined, to: '2026-09-08' });

    expect(until?.toISOString()).toBe('2026-09-08T21:00:00.000Z');
  });

  it('без дат границ нет вовсе', () => {
    expect(activityPeriod({ from: undefined, to: undefined })).toEqual({
      since: undefined,
      until: undefined,
    });
  });

  it('период чистки считается теми же границами, что и отбор', () => {
    const range = activityCleanupPeriod({ from: '2026-09-01', to: '2026-09-08' });

    expect({ since: range.since.toISOString(), until: range.until.toISOString() }).toEqual({
      since: '2026-08-31T21:00:00.000Z',
      until: '2026-09-08T21:00:00.000Z',
    });
  });
});

describe('🔴 что у записи правится, а что нет', () => {
  it('пометка — обычный текст с ограничением длины', () => {
    expect(activityNoteSchema.safeParse({ note: ' разобрались ' })).toMatchObject({
      success: true,
      data: { note: 'разобрались' },
    });
  });

  it('пустая пометка принимается: стереть написанное — не то же, что переписать событие', () => {
    expect(activityNoteSchema.safeParse({ note: '' }).success).toBe(true);
  });

  it('пометка длиннее двух тысяч знаков не принимается', () => {
    expect(activityNoteSchema.safeParse({ note: 'я'.repeat(2001) }).success).toBe(false);
  });

  /**
   * 🔴 Перечень неизменяемых полей — это то, по чему ручка отвечает 403
   * (issue #824). Проверка перечисляет их поимённо: автор, время и состав
   * изменений обязаны быть в нём всегда, иначе журнал переписывается.
   */
  it.each(['actorId', 'actor', 'createdAt', 'changes', 'id', 'action', 'entity', 'entityId'])(
    'попытка переписать %s — видна',
    (field) => {
      expect(activityImmutableFieldsIn({ [field]: 'x' })).toEqual([field]);
    },
  );

  it('пометка неизменяемым полем не считается — иначе править было бы нечего', () => {
    expect(activityImmutableFieldsIn({ note: 'разобрались' })).toEqual([]);
  });

  it('тело не объект — переписывать нечего, но и падать не на чем', () => {
    expect(activityImmutableFieldsIn(null)).toEqual([]);
    expect(activityImmutableFieldsIn('строка')).toEqual([]);
  });
});

describe('чистка за период', () => {
  it('обе границы обязательны', () => {
    expect(activityCleanupSchema.safeParse({ from: '2025-01-01' }).success).toBe(false);
    expect(activityCleanupSchema.safeParse({}).success).toBe(false);
  });

  it('период задом наперёд не принимается', () => {
    expect(activityCleanupSchema.safeParse({ from: '2025-12-31', to: '2025-01-01' }).success).toBe(
      false,
    );
  });

  it('один день — законный период', () => {
    expect(activityCleanupSchema.safeParse({ from: '2025-01-01', to: '2025-01-01' }).success).toBe(
      true,
    );
  });

  it('след чистки подписан самим периодом: ссылаться ему больше не на что', () => {
    expect(activityPeriodKey({ from: '2025-01-01', to: '2025-12-31' })).toBe(
      '2025-01-01..2025-12-31',
    );
  });

  /* 🔴 То, что чистка не удаляет никогда. Список пуст — журнал перестаёт
     отвечать, кто и когда его чистил (issue #822). */
  it('след чистки назван действием, которое чистка не трогает', () => {
    expect(ACTIVITY_CLEANUP_TRAIL).toContain('activity.cleanup');
  });
});
